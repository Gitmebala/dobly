import { createApproval } from "@/lib/approvals";
import { getConnectorExecutor, getExecutorForStep } from "@/lib/connectors/registry";
import { explainWorkflowFailure } from "@/lib/plans";
import { logWorkflowRunEvent } from "@/lib/run-events";
import { getDoblySkill } from "@/lib/skills/registry";
import { executeDoblySkill } from "@/lib/skills/execute";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type {
  Workflow,
  WorkflowActionStep,
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStep,
  WorkflowTrigger,
} from "@/types";

type JsonRecord = Record<string, unknown>;

interface ExecutionContext {
  workflow: Workflow;
  runId: string;
  definition: WorkflowDefinition;
  triggerPayload: JsonRecord;
  trigger: WorkflowTrigger;
  stepOutputs: Record<string, JsonRecord>;
}

interface ExecutionOptions {
  runId?: string;
  startStepIndex?: number;
  stepOutputs?: Record<string, JsonRecord>;
  resumedFromApprovalId?: string | null;
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

  if (step.actionType === "send_email") return "medium";
  if (step.actionType === "webhook_request") return "medium";
  return "low";
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

  if (operator.autonomy === "supervised" && (step.executionType === "intelligence" || step.actionType === "webhook_request" || step.actionType === "send_email")) {
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

async function runStep(step: WorkflowActionStep, context: ExecutionContext): Promise<JsonRecord> {
  const config = interpolateValue(step.config, context) as JsonRecord;
  const mappedExecutor = getExecutorForStep(step);
  if (mappedExecutor) {
    return mappedExecutor.execute({
      workflow: context.workflow,
      runId: context.runId,
      definition: context.definition,
      trigger: context.trigger,
      triggerPayload: context.triggerPayload,
      step,
      config,
      stepOutputs: context.stepOutputs,
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
    const executor = getConnectorExecutor(connectorExecutorId);
    if (!executor) {
      throw new Error(`Missing executor for ${connectorExecutorId}`);
    }

    return executor.execute({
      workflow: context.workflow,
      runId: context.runId,
      definition: context.definition,
      trigger: context.trigger,
      triggerPayload: context.triggerPayload,
      step,
      config,
      stepOutputs: context.stepOutputs,
    });
  }

  switch (step.actionType) {
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
      const result = await executeDoblySkill(step.skillKey, {
        workflow: context.workflow,
        definition: context.definition,
        trigger: context.trigger,
        triggerPayload: context.triggerPayload,
        step,
        config,
        stepOutputs: context.stepOutputs,
      });
      return {
        ...result.output,
        _skill: step.skillKey,
        _execution_type: result.usage?.executionType ?? step.executionType ?? "standard",
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
  const admin = createAdminSupabaseClient();
  const definition = workflow.blueprint.definition;

  if (!definition) {
    throw new Error("Workflow has no executable definition.");
  }

  const trigger = triggerOverride ?? definition.trigger;
  const { run, existingStepResults } = await getOrCreateRun({
    workflow,
    trigger,
    triggerPayload,
    options,
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
    },
  });

  const context: ExecutionContext = {
    workflow,
    runId: run.id,
    definition,
    triggerPayload,
    trigger,
    stepOutputs: options?.stepOutputs ?? {},
  };

  const stepResults: WorkflowRunStep[] = [...existingStepResults];
  const startStepIndex = Math.max(0, options?.startStepIndex ?? 0);

  try {
    const enabledSteps = definition.steps.filter((item) => item.enabled);

    for (let index = startStepIndex; index < enabledSteps.length; index += 1) {
      const step = enabledSteps[index]!;
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
          channel: "app",
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
          eventData: { approvalId: approval.id, stepId: step.id, stepName: step.name },
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

      const output = await runStep(step, context);
      context.stepOutputs[step.id] = output;

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
        eventData: { stepId: step.id, stepName: step.name, output },
      });
    }

    const finished = new Date().toISOString();
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
        runs_count: (workflow.runs_count ?? 0) + (options?.runId ? 0 : 1),
        last_run_at: finished,
      })
      .eq("id", workflow.id);

    await admin.from("usage_logs").insert({
      user_id: workflow.user_id,
      action: "standard_execution",
      metadata: {
        workflow_id: workflow.id,
        trigger_type: trigger.type,
        operator_mode: definition.operator?.enabled ? definition.operator.mode : "workflow",
      },
    });

    await logWorkflowRunEvent({
      workflowId: workflow.id,
      runId: run.id,
      userId: workflow.user_id,
      eventType: "run.completed",
      eventData: { steps: stepResults.length },
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
