import { createApproval } from "@/lib/approvals";
import { executeClaudeMcpStep } from "@/lib/claude-mcp";
import { getConnectorExecutor, getExecutorForStep } from "@/lib/connectors/registry";
import { explainWorkflowFailure } from "@/lib/plans";
import { logWorkflowRunEvent } from "@/lib/run-events";
import { getDoblySkill } from "@/lib/skills/registry";
import { executeDoblySkill } from "@/lib/skills/execute";
import { compileExecutionPlan } from "@/lib/runtime/planner";
import {
  createWorkflowReport,
  loadWorkflowRuntimeState,
  persistWorkflowMemory,
} from "@/lib/runtime/state";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { assertEmergencyStopInactive } from "@/lib/feature-flags";
import type {
  ApprovalChannel,
  Workflow,
  WorkflowActionStep,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStep,
  WorkflowTrigger,
} from "@/types";
import { getClaudeMcpTool } from "@/lib/mcp-registry";
import { executeMeteredConnector } from "@/lib/billing/connector-metering";
import { CostConfirmationRequiredError } from "@/lib/billing/economy";

type JsonRecord = Record<string, unknown>;

interface ExecutionContext {
  workflow: Workflow;
  runId: string;
  definition: WorkflowDefinition;
  triggerPayload: JsonRecord;
  trigger: WorkflowTrigger;
  stepOutputs: Record<string, JsonRecord>;
  memory: Record<string, JsonRecord>;
  runtime: {
    agentId: string | null;
    automationId: string | null;
    dedupeFingerprint: string;
    duplicateRunId: string | null;
    dryRun: boolean;
    costApproved: boolean;
    plannerSummary: {
      mode: string;
      planner: string;
      insertedRuntimeSteps: string[];
      recentRunCount: number;
    };
  };
}

interface ExecutionOptions {
  runId?: string;
  startStepIndex?: number;
  stepOutputs?: Record<string, JsonRecord>;
  resumedFromApprovalId?: string | null;
  dryRun?: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvePath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function interpolateString(template: string, context: ExecutionContext) {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawPath) => {
    const path = String(rawPath).trim();

    if (path === "trigger") return JSON.stringify(context.triggerPayload);
    if (path === "workflow.title") return context.workflow.title;
    if (path.startsWith("trigger.")) {
      const value = resolvePath(context.triggerPayload, path.replace(/^trigger\./, ""));
      return value == null ? "" : String(value);
    }
    if (path.startsWith("steps.")) {
      const value = resolvePath(context.stepOutputs, path.replace(/^steps\./, ""));
      return value == null ? "" : String(value);
    }
    if (path.startsWith("output.")) {
      const value = resolvePath(context.stepOutputs, path.replace(/^output\./, ""));
      if (value == null) return "";
      return typeof value === "string" ? value : JSON.stringify(value);
    }
    if (path.startsWith("memory.")) {
      const value = resolvePath(context.memory, path.replace(/^memory\./, ""));
      return value == null ? "" : String(value);
    }
    if (path.startsWith("runtime.")) {
      const value = resolvePath(context.runtime, path.replace(/^runtime\./, ""));
      return value == null ? "" : String(value);
    }

    return "";
  });
}

function interpolateValue<T>(value: T, context: ExecutionContext): T {
  if (typeof value === "string") {
    return interpolateString(value, context) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, context)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        interpolateValue(item, context),
      ]),
    ) as T;
  }
  return value;
}

function riskRank(level: "low" | "medium" | "high") {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function getStepRiskLevel(step: WorkflowActionStep) {
  if (step.actionType === "skill" && step.skillKey) {
    return getDoblySkill(step.skillKey)?.manifest.riskLevel ?? "medium";
  }

  if (step.actionType === "claude_mcp") {
    return getClaudeMcpTool(String(step.config.toolId ?? ""))?.riskLevel ?? "high";
  }
  if (step.actionType === "send_email") return "medium";
  if (step.actionType === "webhook_request") return "medium";
  return "low";
}

function evaluateStepCondition(step: WorkflowActionStep, context: ExecutionContext) {
  const condition = step.condition;
  if (!condition) return true;

  const source =
    condition.source === "trigger"
      ? context.triggerPayload
      : condition.source === "steps"
        ? context.stepOutputs
        : condition.source === "memory"
          ? context.memory
          : context.runtime;
  const left = resolvePath(source, condition.path);
  const right = condition.value;

  switch (condition.operator) {
    case "exists":
      return left !== undefined && left !== null;
    case "not_exists":
      return left === undefined || left === null;
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      return Array.isArray(left)
        ? left.includes(right)
        : String(left ?? "").toLowerCase().includes(String(right ?? "").toLowerCase());
    case "greater_than":
      return Number(left ?? 0) > Number(right ?? 0);
    case "less_than":
      return Number(left ?? 0) < Number(right ?? 0);
    case "truthy":
      return Boolean(left);
    case "falsy":
      return !left;
    default:
      return true;
  }
}

function summarizeRun(stepResults: WorkflowRunStep[]) {
  const successCount = stepResults.filter((step) => step.status === "success").length;
  const failedCount = stepResults.filter((step) => step.status === "failed").length;
  const lastOutput = [...stepResults]
    .reverse()
    .find((step) => step.output && Object.keys(step.output).length > 0)?.output;

  const highlight = (() => {
    if (!lastOutput) return "Dobly completed the run and stored the latest outputs.";
    if (typeof lastOutput.summary === "string") return lastOutput.summary;
    if (typeof lastOutput.report === "string") return lastOutput.report;
    if (typeof lastOutput.response === "string") return lastOutput.response;
    return JSON.stringify(lastOutput).slice(0, 280);
  })();

  return `Completed ${successCount} step${successCount === 1 ? "" : "s"}${
    failedCount ? ` with ${failedCount} failure${failedCount === 1 ? "" : "s"}` : ""
  }. ${highlight}`.trim();
}

function buildReportBody(context: ExecutionContext, stepResults: WorkflowRunStep[]) {
  const lines = [
    `Workflow: ${context.workflow.title}`,
    `Mode: ${context.runtime.plannerSummary.mode}`,
    `Planner: ${context.runtime.plannerSummary.planner}`,
    `Trigger: ${context.trigger.label}`,
    `Run type: ${context.runtime.dryRun ? "dry_run" : "live"}`,
    "",
    summarizeRun(stepResults),
    "",
    "Step results:",
    ...stepResults.map((step) => `- ${step.name}: ${step.status}`),
  ];

  if (context.runtime.plannerSummary.insertedRuntimeSteps.length > 0) {
    lines.push(
      "",
      `Runtime assists: ${context.runtime.plannerSummary.insertedRuntimeSteps.join(", ")}`
    );
  }

  return lines.join("\n");
}

function buildApprovalRequirement(step: WorkflowActionStep, context: ExecutionContext) {
  const operator = context.definition.operator;
  const skill = step.actionType === "skill" && step.skillKey ? getDoblySkill(step.skillKey) : null;
  const stepRisk = getStepRiskLevel(step);

  if (skill?.manifest.approvalRequired) {
    return {
      required: true,
      riskLevel: skill.manifest.riskLevel,
      reason: `${step.name} requires explicit approval before Dobly can continue.`,
    };
  }

  if (!operator?.enabled || operator.mode !== "bounded_operator") {
    return { required: false as const };
  }

  if (operator.autonomy === "supervised" && (step.executionType === "intelligence" || step.actionType === "webhook_request" || step.actionType === "send_email" || step.actionType === "claude_mcp")) {
    return {
      required: true,
      riskLevel: stepRisk,
      reason: `${operator.role} is running in supervised mode, so this step needs approval.`,
    };
  }

  if (riskRank(stepRisk) >= riskRank(operator.approvalRiskThreshold)) {
    return {
      required: true,
      riskLevel: stepRisk,
      reason: `${step.name} crosses the operator approval threshold.`,
    };
  }

  return { required: false as const };
}

function getStepRetryPolicy(step: WorkflowActionStep) {
  const rawAttempts = Number(
    ((step.config.retryPolicy as JsonRecord | undefined)?.attempts ?? step.config.retryAttempts ?? undefined) ?? NaN,
  );
  const rawBackoff = Number(
    ((step.config.retryPolicy as JsonRecord | undefined)?.backoffSeconds ?? step.config.retryBackoffSeconds ?? undefined) ?? NaN,
  );

  const defaultAttempts =
    step.actionType === "webhook_request" || step.actionType === "send_email" || step.actionType === "file_write" || step.actionType === "claude_mcp"
      ? 2
      : 0;

  return {
    attempts: Number.isFinite(rawAttempts) ? Math.max(0, Math.min(3, rawAttempts)) : defaultAttempts,
    backoffSeconds: Number.isFinite(rawBackoff) ? Math.max(1, Math.min(30, rawBackoff)) : 3,
  };
}

function resolveRuntimeBudget(definition: WorkflowDefinition) {
  const runtime = definition.runtime;
  return {
    maxRunSeconds: Number.isFinite(Number(runtime?.maxRunSeconds))
      ? Math.max(30, Math.min(3_600, Number(runtime?.maxRunSeconds)))
      : 600,
    maxStepCount: Number.isFinite(Number(runtime?.maxStepCount))
      ? Math.max(1, Math.min(200, Number(runtime?.maxStepCount)))
      : 50,
  };
}

async function runStep(step: WorkflowActionStep, context: ExecutionContext): Promise<JsonRecord> {
  const config = interpolateValue(step.config, context) as JsonRecord;
  if (context.runtime.dryRun) {
    return {
      dryRun: true,
      simulated: true,
      actionType: step.actionType,
      app: step.app,
      summary: `Dry run simulated ${step.name} without touching live systems.`,
      configPreview: config,
    };
  }

  const mappedExecutor = getExecutorForStep(step);
  if (mappedExecutor) {
    assertEmergencyStopInactive("external_actions");
    return executeMeteredConnector({
      userId: context.workflow.user_id,
      runId: context.runId,
      step,
      executorId: mappedExecutor.id,
      approvedCost: context.runtime.costApproved,
      execute: () => mappedExecutor.execute({
        workflow: context.workflow,
        runId: context.runId,
        definition: context.definition,
        trigger: context.trigger,
        triggerPayload: context.triggerPayload,
        step,
        config,
        stepOutputs: context.stepOutputs,
      }),
    });
  }

  const connectorExecutorId =
    step.actionType === "send_email"
      ? "generic.email"
      : step.actionType === "webhook_request"
        ? "generic.http"
        : step.actionType === "file_write"
          ? "generic.file"
          : null;

  if (connectorExecutorId) {
    assertEmergencyStopInactive("external_actions");
    const executor = getConnectorExecutor(connectorExecutorId);
    if (!executor) {
      throw new Error(`Missing executor for ${connectorExecutorId}`);
    }

    return executeMeteredConnector({
      userId: context.workflow.user_id,
      runId: context.runId,
      step,
      executorId: executor.id,
      approvedCost: context.runtime.costApproved,
      execute: () => executor.execute({
        workflow: context.workflow,
        runId: context.runId,
        definition: context.definition,
        trigger: context.trigger,
        triggerPayload: context.triggerPayload,
        step,
        config,
        stepOutputs: context.stepOutputs,
      }),
    });
  }

  switch (step.actionType) {
    case "claude_mcp": {
      const toolId = String(config.toolId ?? "").trim();
      const task = String(config.task ?? step.description).trim();
      const contextEnvelope = {
        workflow: {
          id: context.workflow.id,
          title: context.workflow.title,
          description: context.workflow.description,
        },
        trigger: context.trigger,
        triggerPayload: context.triggerPayload,
        priorStepOutputs: context.stepOutputs,
        memory: context.memory,
        runtime: context.runtime.plannerSummary,
      };
      const response = await executeClaudeMcpStep({
        task,
        context: contextEnvelope,
        toolId,
        outputSchema:
          config.outputSchema && typeof config.outputSchema === "object"
            ? (config.outputSchema as JsonRecord)
            : null,
        allowedTools: Array.isArray(config.allowedTools)
          ? config.allowedTools.map((item) => String(item))
          : null,
        model: typeof config.model === "string" ? config.model : null,
        maxTokens: Number(config.maxTokens ?? 2000),
        timeoutMs: Number(config.timeoutMs ?? 90000),
      });

      return {
        summary: response.summary,
        text: response.text,
        model: response.model,
        toolId: response.toolId,
        serverUrl: response.serverUrl,
        usage: response.usage ?? null,
        artifacts: [],
        rawContent: response.rawContent,
      };
    }
    case "compose_text": {
      const text = String(config.template ?? step.description);
      return { text };
    }
    case "delay": {
      const amount = Number(config.amount ?? 0);
      const unit = String(config.unit ?? "seconds");
      const multiplier = unit === "minutes" ? 60_000 : unit === "hours" ? 3_600_000 : 1_000;
      const durationMs = Math.max(0, amount * multiplier);

      if (durationMs > 0) {
        await sleep(Math.min(durationMs, 30_000));
      }

      return { waited_ms: durationMs };
    }
    case "branch": {
      const left = String(config.left ?? "");
      const right = String(config.right ?? "");
      const operator = String(config.operator ?? "equals");
      const passed = operator === "equals" ? left === right : left !== right;

      if (!passed) {
        throw new Error(`Branch stopped run: ${left} ${operator} ${right}`);
      }

      return { passed };
    }
    case "skill": {
      if (!step.skillKey) {
        throw new Error(`Missing skill key for step ${step.id}`);
      }
      const skill = getDoblySkill(step.skillKey);
      const result = await executeMeteredConnector({
        userId: context.workflow.user_id,
        runId: context.runId,
        step,
        executorId: skill?.manifest.executionType === "intelligence" ? "native.orchestrator.skill" : "native.dobly.skill",
        approvedCost: context.runtime.costApproved,
        execute: () => executeDoblySkill(step.skillKey!, {
          workflow: context.workflow,
          definition: context.definition,
          trigger: context.trigger,
          triggerPayload: context.triggerPayload,
          step,
          config,
          stepOutputs: context.stepOutputs,
        }),
      });
      return {
        ...result.output,
        _skill: step.skillKey,
        _execution_type: result.usage?.executionType ?? step.executionType ?? "standard",
      };
    }
    case "orchestrate_document": {
      const title = String(config.title ?? step.name);
      const sections = Array.isArray(config.sections) ? config.sections : [];
      const body = sections.length
        ? sections.map((section) => `## ${String((section as JsonRecord).heading ?? "Section")}\n${String((section as JsonRecord).content ?? "")}`).join("\n\n")
        : String(config.body ?? step.description);
      return {
        title,
        body,
        markdown: `# ${title}\n\n${body}`,
      };
    }
    case "send_email":
    case "webhook_request":
    case "file_write":
      throw new Error(`Unsupported action type: ${String(step.actionType)}`);
    default:
      if (String(step.actionType ?? "") === "browser_agent" || String(step.actionType ?? "") === "local_agent") {
        throw new Error("This workflow still uses a legacy Dobly agent step. Open it in the editor and resave it into a supported connector or skill step.");
      }
      throw new Error(`Unsupported action type: ${String(step.actionType)}`);
  }
}

async function runStepWithRetry(step: WorkflowActionStep, context: ExecutionContext) {
  const retryPolicy = getStepRetryPolicy(step);
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retryPolicy.attempts) {
    attempt += 1;
    try {
      const output = await runStep(step, context);
      return {
        output: {
          ...output,
          _meta: {
            attempts: attempt,
            dryRun: context.runtime.dryRun,
            retryPolicy,
          },
        } satisfies JsonRecord,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      if (attempt > retryPolicy.attempts) break;

      await logWorkflowRunEvent({
        workflowId: context.workflow.id,
        runId: context.runId,
        userId: context.workflow.user_id,
        eventType: "step.retry_scheduled",
        eventData: {
          stepId: step.id,
          stepName: step.name,
          attempt,
          nextAttempt: attempt + 1,
          backoffSeconds: retryPolicy.backoffSeconds,
          error: error instanceof Error ? error.message : "Step failed.",
        },
      });

      await sleep(retryPolicy.backoffSeconds * 1000);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Step failed.");
}

async function getOrCreateRun(params: {
  workflow: Workflow;
  trigger: WorkflowTrigger;
  triggerPayload: JsonRecord;
  options?: ExecutionOptions;
}) {
  const admin = createAdminSupabaseClient();
  const startedAt = new Date().toISOString();

  if (params.options?.runId) {
    const { data: existingRun, error } = await admin
      .from("workflow_runs")
      .select("*")
      .eq("id", params.options.runId)
      .single();

    if (error || !existingRun) {
      throw new Error("Failed to load the existing workflow run.");
    }

    await admin
      .from("workflow_runs")
      .update({
        status: "running",
        error_message: null,
        finished_at: null,
      })
      .eq("id", params.options.runId);

    return {
      run: {
        ...(existingRun as WorkflowRun),
        status: "running" as const,
        error_message: null,
        finished_at: null,
      },
      existingStepResults: ((existingRun.step_results ?? []) as WorkflowRunStep[]),
    };
  }

  const runInsert = await admin
    .from("workflow_runs")
    .insert({
      workflow_id: params.workflow.id,
      user_id: params.workflow.user_id,
      status: "running",
      trigger_type: params.trigger.type,
      trigger_payload: params.triggerPayload,
      step_results: [],
      started_at: startedAt,
    })
    .select("*")
    .single();

  if (runInsert.error || !runInsert.data) {
    throw new Error("Failed to create workflow run.");
  }

  return {
    run: runInsert.data as WorkflowRun,
    existingStepResults: [] as WorkflowRunStep[],
  };
}

export async function executeWorkflow(
  workflow: Workflow,
  triggerPayload: JsonRecord,
  triggerOverride?: WorkflowTrigger,
  options?: ExecutionOptions,
) {
  assertEmergencyStopInactive("execution");
  const admin = createAdminSupabaseClient();
  const definition = workflow.blueprint.definition;

  if (!definition) {
    throw new Error("Workflow has no executable definition.");
  }

  const trigger = triggerOverride ?? definition.trigger;
  const { data: profile } = await admin
    .from("profiles")
    .select("notification_preference")
    .eq("id", workflow.user_id)
    .single();
  const approvalChannel = ((profile?.notification_preference as ApprovalChannel | null) ?? "app");
  const { run, existingStepResults } = await getOrCreateRun({
    workflow,
    trigger,
    triggerPayload,
    options,
  });
  const runtimeState = await loadWorkflowRuntimeState(workflow, triggerPayload);
  const compiledPlan = compileExecutionPlan({
    workflow,
    triggerPayload,
    definition,
    memory: runtimeState.memory,
    recentRuns: runtimeState.recentRuns,
  });

  await logWorkflowRunEvent({
    workflowId: workflow.id,
    runId: run.id,
    userId: workflow.user_id,
    eventType: options?.resumedFromApprovalId ? "run.resumed" : "run.started",
    eventData: {
      triggerType: trigger.type,
      approvalId: options?.resumedFromApprovalId ?? null,
      mode: definition.operator?.enabled ? definition.operator.mode : "workflow",
      runtimeMode: compiledPlan.summary.mode,
      runtimePlanner: compiledPlan.summary.planner,
      dryRun: Boolean(options?.dryRun),
      costApproved: Boolean(options?.resumedFromApprovalId),
    },
  });

  if (runtimeState.duplicateRunId && !options?.runId) {
    const duplicateMessage = `Dobly skipped this run because the same signal was already handled recently in run ${runtimeState.duplicateRunId}.`;
    await admin
      .from("workflow_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        error_message: duplicateMessage,
        step_results: existingStepResults,
      })
      .eq("id", run.id);

    await createWorkflowReport({
      userId: workflow.user_id,
      workflowId: workflow.id,
      runId: run.id,
      agentId: runtimeState.agentId,
      automationId: runtimeState.automationId,
      reportType: "dedupe",
      title: `${workflow.title} skipped duplicate signal`,
      body: duplicateMessage,
    }).catch(() => {});

    await logWorkflowRunEvent({
      workflowId: workflow.id,
      runId: run.id,
      userId: workflow.user_id,
      eventType: "run.deduped",
      eventData: {
        duplicateRunId: runtimeState.duplicateRunId,
        fingerprint: runtimeState.dedupeFingerprint,
      },
    });

    return {
      run: {
        ...run,
        status: "success",
        finished_at: new Date().toISOString(),
        error_message: duplicateMessage,
        step_results: existingStepResults,
      } as WorkflowRun,
    };
  }

  const context: ExecutionContext = {
    workflow,
    runId: run.id,
    definition,
    triggerPayload,
    trigger,
    stepOutputs: options?.stepOutputs ?? {},
    memory: runtimeState.memory,
    runtime: {
      agentId: runtimeState.agentId,
      automationId: runtimeState.automationId,
      dedupeFingerprint: runtimeState.dedupeFingerprint,
      duplicateRunId: runtimeState.duplicateRunId,
      dryRun: Boolean(options?.dryRun),
      costApproved: Boolean(options?.resumedFromApprovalId),
      plannerSummary: compiledPlan.summary,
    },
  };

  const stepResults: WorkflowRunStep[] = [...existingStepResults];
  const startStepIndex = Math.max(0, options?.startStepIndex ?? 0);
  const runtimeBudget = resolveRuntimeBudget(definition);
  const runStartedAt = Date.now();

  try {
    const enabledSteps = compiledPlan.steps.map((item) => item.step).filter((item) => item.enabled);

    if (enabledSteps.length > runtimeBudget.maxStepCount) {
      throw new Error(
        `Workflow exceeds the per-run step budget of ${runtimeBudget.maxStepCount}. Reduce steps or raise the runtime limit.`
      );
    }

    await logWorkflowRunEvent({
      workflowId: workflow.id,
      runId: run.id,
      userId: workflow.user_id,
      eventType: "run.planned",
      eventData: {
        ...compiledPlan.summary,
        runtimeBudget,
      },
    });

    for (let index = startStepIndex; index < enabledSteps.length; index += 1) {
      const elapsedSeconds = Math.floor((Date.now() - runStartedAt) / 1000);
      if (elapsedSeconds > runtimeBudget.maxRunSeconds) {
        await logWorkflowRunEvent({
          workflowId: workflow.id,
          runId: run.id,
          userId: workflow.user_id,
          eventType: "run.budget_exceeded",
          eventData: {
            elapsedSeconds,
            maxRunSeconds: runtimeBudget.maxRunSeconds,
            stepIndex: index,
          },
        });
        throw new Error(
          `Workflow exceeded its runtime budget of ${runtimeBudget.maxRunSeconds} seconds.`
        );
      }

      const step = enabledSteps[index]!;
      if (!evaluateStepCondition(step, context)) {
        stepResults.push({
          id: step.id,
          name: step.name,
          status: "success",
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          input: step.config,
          output: { skipped: true, reason: "Condition not met" },
          error: null,
        });

        await logWorkflowRunEvent({
          workflowId: workflow.id,
          runId: run.id,
          userId: workflow.user_id,
          eventType: "step.skipped",
          eventData: { stepId: step.id, stepName: step.name, condition: step.condition },
        });
        continue;
      }

      const isApprovedResumeStep = Boolean(options?.resumedFromApprovalId) && index === startStepIndex;
      const approvalRequirement = isApprovedResumeStep ? { required: false as const } : buildApprovalRequirement(step, context);

      if (approvalRequirement.required) {
        const approval = await createApproval({
          workflowId: workflow.id,
          userId: workflow.user_id,
          runId: run.id,
          title: `${step.name} needs approval`,
          message: approvalRequirement.reason,
          actionLabel: "Approve and continue",
          riskLevel: approvalRequirement.riskLevel,
          channel: approvalChannel,
          metadata: {
            resume: {
              workflowId: workflow.id,
              runId: run.id,
              stepIndex: index,
              stepId: step.id,
              trigger,
              triggerPayload,
              stepOutputs: context.stepOutputs,
            },
            operator: definition.operator ?? null,
            runtime: context.runtime.plannerSummary,
            step: {
              id: step.id,
              name: step.name,
              actionType: step.actionType,
              app: step.app,
            },
          },
        });

        await admin
          .from("workflow_runs")
          .update({
            status: "awaiting_approval",
            error_message: "Waiting for approval before continuing.",
            step_results: stepResults,
          })
          .eq("id", run.id);

        await logWorkflowRunEvent({
          workflowId: workflow.id,
          runId: run.id,
          userId: workflow.user_id,
          eventType: "run.awaiting_approval",
          eventData: { approvalId: approval.id, stepId: step.id, stepName: step.name, channel: approvalChannel },
        });

        return {
          run: {
            ...run,
            status: "awaiting_approval",
            error_message: "Waiting for approval before continuing.",
            step_results: stepResults,
          } as WorkflowRun,
          approval,
        };
      }

      const stepStarted = new Date().toISOString();
      await logWorkflowRunEvent({
        workflowId: workflow.id,
        runId: run.id,
        userId: workflow.user_id,
        eventType: "step.started",
        eventData: { stepId: step.id, stepName: step.name },
      });

      try {
        const execution = await runStepWithRetry(step, context);
        const output = execution.output;
        context.stepOutputs[step.id] = output;
        if (step.saveOutputAs) {
          context.stepOutputs[step.saveOutputAs] = output;
        }

        stepResults.push({
          id: step.id,
          name: step.name,
          status: "success",
          started_at: stepStarted,
          finished_at: new Date().toISOString(),
          input: step.config,
          output,
          error: null,
        });

        await logWorkflowRunEvent({
          workflowId: workflow.id,
          runId: run.id,
          userId: workflow.user_id,
          eventType: "step.completed",
          eventData: { stepId: step.id, stepName: step.name, output, attempts: execution.attempts },
        });
      } catch (stepError) {
        if (stepError instanceof CostConfirmationRequiredError) {
          const approval = await createApproval({
            workflowId: workflow.id,
            userId: workflow.user_id,
            runId: run.id,
            title: `Approve the activity budget for ${step.name}`,
            message: `This unusually expensive action is estimated to use KSh ${(stepError.estimatedMinor / 100).toLocaleString()} of operating capacity.`,
            actionLabel: "Approve and continue",
            riskLevel: "medium",
            channel: approvalChannel,
            metadata: {
              billing: { estimatedMinor: stepError.estimatedMinor, currency: "KES" },
              resume: {
                workflowId: workflow.id,
                runId: run.id,
                stepIndex: index,
                stepId: step.id,
                trigger,
                triggerPayload,
                stepOutputs: context.stepOutputs,
              },
              step: { id: step.id, name: step.name, actionType: step.actionType, app: step.app },
            },
          });
          await admin.from("workflow_runs").update({
            status: "awaiting_approval",
            error_message: "Waiting for activity-budget approval.",
            step_results: stepResults,
          }).eq("id", run.id);
          return {
            run: {
              ...run,
              status: "awaiting_approval",
              error_message: "Waiting for activity-budget approval.",
              step_results: stepResults,
            } as WorkflowRun,
            approval,
          };
        }
        const message = explainWorkflowFailure(
          stepError instanceof Error ? stepError.message : "Step failed."
        );

        stepResults.push({
          id: step.id,
          name: step.name,
          status: "failed",
          started_at: stepStarted,
          finished_at: new Date().toISOString(),
          input: step.config,
          output: null,
          error: message,
        });

        await logWorkflowRunEvent({
          workflowId: workflow.id,
          runId: run.id,
          userId: workflow.user_id,
          eventType: "step.failed",
          eventData: { stepId: step.id, stepName: step.name, error: message },
        });

        if (step.onFailure === "continue") {
          continue;
        }

        if (step.onFailure === "escalate") {
          const approval = await createApproval({
            workflowId: workflow.id,
            userId: workflow.user_id,
            runId: run.id,
            title: `${step.name} failed and needs review`,
            message,
            actionLabel: "Review before continuing",
            riskLevel: "high",
            channel: approvalChannel,
            metadata: {
              resume: {
                workflowId: workflow.id,
                runId: run.id,
                stepIndex: index + 1,
                stepId: step.id,
                trigger,
                triggerPayload,
                stepOutputs: context.stepOutputs,
              },
              step: {
                id: step.id,
                name: step.name,
                actionType: step.actionType,
                app: step.app,
              },
            },
          });

          await admin
            .from("workflow_runs")
            .update({
              status: "awaiting_approval",
              error_message: message,
              step_results: stepResults,
            })
            .eq("id", run.id);

          return {
            run: {
              ...run,
              status: "awaiting_approval",
              error_message: message,
              step_results: stepResults,
            } as WorkflowRun,
            approval,
          };
        }

        throw stepError;
      }
    }

    const finished = new Date().toISOString();
    const reportBody = buildReportBody(context, stepResults);
    const runSummary = summarizeRun(stepResults);
    await admin
      .from("workflow_runs")
      .update({
        status: "success",
        finished_at: finished,
        error_message: null,
        step_results: stepResults,
      })
      .eq("id", run.id);

    await admin
      .from("workflows")
      .update({
        runs_count: (workflow.runs_count ?? 0) + (options?.runId || options?.dryRun ? 0 : 1),
        last_run_at: finished,
      })
      .eq("id", workflow.id);

    if (runtimeState.automationId) {
      await admin
        .from("automations")
        .update({
          last_run_at: finished,
        })
        .eq("id", runtimeState.automationId);
    }

    if (!options?.dryRun) {
      await admin.from("usage_logs").insert({
        user_id: workflow.user_id,
        action: "standard_execution",
        metadata: {
          workflow_id: workflow.id,
          trigger_type: trigger.type,
          operator_mode: definition.operator?.enabled ? definition.operator.mode : "workflow",
          runtime_mode: compiledPlan.summary.mode,
          dry_run: false,
        },
      });
    }

    await persistWorkflowMemory({
      agentId: runtimeState.agentId,
      workflow,
      triggerPayload,
      stepOutputs: context.stepOutputs,
      summary: runSummary,
    }).catch(() => {});

    await createWorkflowReport({
      userId: workflow.user_id,
      workflowId: workflow.id,
      runId: run.id,
      agentId: runtimeState.agentId,
      automationId: runtimeState.automationId,
      reportType: options?.dryRun ? "dry_run" : "run_summary",
      title: options?.dryRun ? `${workflow.title} dry run completed` : `${workflow.title} completed`,
      body: reportBody,
    }).catch(() => {});

    await logWorkflowRunEvent({
      workflowId: workflow.id,
      runId: run.id,
      userId: workflow.user_id,
      eventType: "run.completed",
      eventData: { steps: stepResults.length, summary: runSummary },
    });

    return {
      run: {
        ...run,
        status: "success",
        finished_at: finished,
        error_message: null,
        step_results: stepResults,
      } as WorkflowRun,
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Workflow execution failed.";
    const message = explainWorkflowFailure(rawMessage);
    const failedStep = stepResults[stepResults.length - 1];

    if (!failedStep || failedStep.finished_at) {
      stepResults.push({
        id: `failed_${stepResults.length + 1}`,
        name: "Execution halted",
        status: "failed",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        input: null,
        output: null,
        error: message,
      });
    }

    await admin
      .from("workflow_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: message,
        step_results: stepResults,
      })
      .eq("id", run.id);

    await admin
      .from("workflows")
      .update({
        last_run_at: new Date().toISOString(),
      })
      .eq("id", workflow.id);

    if (runtimeState.automationId) {
      await admin
        .from("automations")
        .update({
          last_run_at: new Date().toISOString(),
        })
        .eq("id", runtimeState.automationId);
    }

    await createWorkflowReport({
      userId: workflow.user_id,
      workflowId: workflow.id,
      runId: run.id,
      agentId: runtimeState.agentId,
      automationId: runtimeState.automationId,
      reportType: "failure",
      title: `${workflow.title} failed`,
      body: buildReportBody(context, stepResults),
      deliveryStatus: "stored",
    }).catch(() => {});

    await logWorkflowRunEvent({
      workflowId: workflow.id,
      runId: run.id,
      userId: workflow.user_id,
      eventType: "run.failed",
      eventData: { error: message },
    });

    throw error;
  }
}
