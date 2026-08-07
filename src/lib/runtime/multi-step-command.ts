import "server-only";
import type { DoblyExecutionIntent } from "@/lib/dobly-inference";
import { createDurableArtifact, createDurableRuntimeRun, completeDurableRuntimeRun } from "@/lib/runtime/durable-runtime";
import { runResearchRuntime } from "@/lib/runtime/research";
import { runMediaRuntime } from "@/lib/runtime/media";
import { runMemorySynthesis } from "@/lib/runtime/memory-synthesis";
import { createSoftwareExecutionRun } from "@/lib/software-execution-runs";
import { planDoblyCommand } from "@/lib/runtime/plain-english-command";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { resolveUniversalExecutionPaths } from "@/lib/runtime/universal-mcp";
import type { UniversalExecutionPath } from "@/lib/runtime/universal-mcp";
import type { DoblyCapability } from "@/lib/runtime/capabilities";
import { executeUniversalMcpPath, executeNativeCapabilityPath } from "@/lib/runtime/universal-mcp-execution";
import { resolveCustomApiExecutionPaths, executeCustomApiAction } from "@/lib/runtime/custom-api";
import type { CustomApiExecutionPath } from "@/lib/runtime/custom-api";
import { executePublishingRuntime } from "@/lib/runtime/publishing-execution";

type JsonRecord = Record<string, unknown>;

export type RuntimePlanStepType =
  | "research"
  | "software_execution"
  | "custom_api"
  | "media"
  | "memory_synthesis"
  | "approval"
  | "delivery_package";

export interface RuntimePlanStep {
  id: string;
  type: RuntimePlanStepType;
  title: string;
  task: string;
  toolId?: string | null;
  customApiActionId?: string | null;
  requiresApproval?: boolean;
}

export interface RuntimeCommandEvent {
  eventType: string;
  title: string;
  summary?: string;
  severity?: "info" | "success" | "warning" | "danger";
  runId?: string | null;
  approvalId?: string | null;
  artifactId?: string | null;
  payload?: JsonRecord;
}

function hasAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function summarizeCommandTitle(prompt: string) {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Command plan and results";
  const limit = 72;
  if (cleaned.length <= limit) return cleaned;
  const cut = cleaned.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : limit)}…`;
}

export function buildRuntimeCommandPlan(prompt: string, intent?: DoblyExecutionIntent | null): RuntimePlanStep[] {
  const lower = prompt.toLowerCase();
  const route = planDoblyCommand({ prompt, intent });
  const steps: RuntimePlanStep[] = [];

  if (hasAny(lower, ["research", "find", "look up", "best", "compare", "investigate"])) {
    steps.push({
      id: "step_research",
      type: "research",
      title: "Research the request",
      task: prompt,
    });
  }

  if (route.route === "software_execution" && route.toolId) {
    steps.push({
      id: "step_software",
      type: "software_execution",
      title: "Operate specialist software",
      task: prompt,
      toolId: route.toolId,
      requiresApproval: true,
    });
  }

  if (route.route === "media" || hasAny(lower, ["video", "image", "post", "carousel", "publish"])) {
    steps.push({
      id: "step_media",
      type: "media",
      title: "Prepare media package",
      task: prompt,
      requiresApproval: lower.includes("publish") || lower.includes("post "),
    });
  }

  if (hasAny(lower, ["remember", "memory", "learn", "synthesize what dobly knows"])) {
    steps.push({
      id: "step_memory",
      type: "memory_synthesis",
      title: "Synthesize memory",
      task: prompt,
    });
  }

  if (hasAny(lower, ["send ", "email", "whatsapp", "publish", "post ", "pay ", "invoice"])) {
    steps.push({
      id: "step_approval",
      type: "approval",
      title: "Ask for approval before external action",
      task: prompt,
      requiresApproval: true,
    });
    steps.push({
      id: "step_delivery_package",
      type: "delivery_package",
      title: "Prepare delivery package",
      task: prompt,
    });
  }

  if (steps.length === 0) {
    steps.push({
      id: "step_research",
      type: "research",
      title: "Investigate and answer",
      task: prompt,
    });
  }

  return steps;
}

export async function executeRuntimeCommandPlan(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  context?: JsonRecord;
  approved?: boolean;
  intent?: DoblyExecutionIntent | null;
  workerId?: string;
  onEvent?: (event: RuntimeCommandEvent) => Promise<void> | void;
}) {
  const commandPlan = planDoblyCommand({ prompt: input.prompt, intent: input.intent ?? null });
  const parentRun = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: "dobly_multi_step_command",
    toolLabel: "Dobly Multi-Step Command",
    toolFamily: "command",
    task: input.prompt,
    riskLevel: "medium",
    context: input.context ?? {},
    intent: commandPlan.intent,
  });

  const steps = buildRuntimeCommandPlan(input.prompt, commandPlan.intent);
  const stepResults: JsonRecord[] = [];
  await input.onEvent?.({
    eventType: "thinking_started",
    title: "Runtime started",
    summary: "The Operator worker picked up the queued job and created a durable run.",
    runId: parentRun.id,
    payload: { parentRun },
  });
  await input.onEvent?.({
    eventType: "plan_created",
    title: "Execution plan created",
    summary: `${steps.length} execution step(s) planned before connected tool resolution.`,
    runId: parentRun.id,
    payload: { steps },
  });
  const universalResolution: { paths: UniversalExecutionPath[] } = await resolveUniversalExecutionPaths({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    prompt: input.prompt,
  }).catch(() => ({ capabilities: [], paths: [] }));
  const customApiResolution: { paths: CustomApiExecutionPath[] } = await resolveCustomApiExecutionPaths({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    prompt: input.prompt,
  }).catch(() => ({ capabilities: [], paths: [] }));
  const mcpPaths = universalResolution.paths.filter((path) => path.kind === "mcp");
  // `resolveUniversalExecutionPaths` also resolves `kind: "native"` paths - a
  // real, live connector (Gmail/Calendar/Drive/M-Pesa/Paystack/HubSpot/voice)
  // reached via office/native-tool-bridge.ts. Only "mcp" was ever spliced into
  // the plan here, so a coworker with e.g. a connected Google account but no
  // MCP server never got a software_execution step at all for that request.
  const nativePaths = universalResolution.paths.filter((path) => path.kind === "native");
  const customApiPaths = customApiResolution.paths.filter((path) => path.kind === "custom_api");
  // inferCapabilitiesFromText can match several capabilities in one prompt
  // (e.g. "calendar" -> manage_calendar AND "conflicts" -> check_availability
  // both fire on "check my calendar for conflicts"). Prefer the more specific
  // read-only check over the event-creating default so a plain availability
  // question doesn't get routed into "create event".
  const CAPABILITY_PREFERENCE_ORDER: DoblyCapability[] = ["check_availability"];
  function preferPath(paths: UniversalExecutionPath[]) {
    for (const capability of CAPABILITY_PREFERENCE_ORDER) {
      const preferred = paths.find((path) => path.capability === capability);
      if (preferred) return preferred;
    }
    return paths[0];
  }
  const bestConnectedPath = preferPath(mcpPaths) ?? preferPath(nativePaths);
  if (bestConnectedPath) {
    // dobly-inference.ts's routeIntentToExecution() unconditionally assigns a
    // static legacy tool (browser_software_ops, crm_sales_ops, ...) for any
    // "task"/"message"-shaped request, before this function ever learns
    // whether a real, live connection exists - so buildRuntimeCommandPlan's
    // own route.toolId frequently already occupies the one software_execution
    // slot with a guess that's usually an unconfigured ANTHROPIC_MCP_* tool
    // (e.g. "browser_software_ops"), and the check here used to back off
    // entirely whenever that slot was already taken. A confirmed live
    // connection is strictly more trustworthy than a static guess, so replace
    // that step instead of yielding to it.
    const connectedStep: RuntimePlanStep = {
      id: "step_universal_mcp",
      type: "software_execution",
      title: "Use connected software",
      task: input.prompt,
      toolId: `universal:${bestConnectedPath.capability}`,
      requiresApproval: bestConnectedPath.approvalRequired,
    };
    const existingIndex = steps.findIndex((step) => step.type === "software_execution");
    if (existingIndex >= 0) {
      steps[existingIndex] = connectedStep;
    } else {
      steps.splice(Math.min(steps.length, 1), 0, connectedStep);
    }
  }
  if (customApiPaths.length > 0 && !steps.some((step) => step.type === "software_execution" || step.type === "custom_api")) {
    steps.splice(Math.min(steps.length, 1), 0, {
      id: "step_custom_api",
      type: "custom_api",
      title: "Use connected custom API",
      task: input.prompt,
      customApiActionId: customApiPaths[0].action.id,
      requiresApproval: customApiPaths[0].approvalRequired,
    });
  }

  await input.onEvent?.({
    eventType: "tool_selected",
    title: "Connected tools resolved",
    summary: `${mcpPaths.length} MCP path(s) and ${customApiPaths.length} custom API path(s) matched this request.`,
    runId: parentRun.id,
    payload: { mcpPaths, customApiPaths, steps },
  });

  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    runId: parentRun.id,
    eventType: "runtime.command.started",
    riskLevel: "medium",
    actorType: "worker",
    actorId: input.workerId ?? null,
    summary: `Started ${steps.length}-step Dobly command.`,
    metadata: { steps },
  }).catch(() => undefined);

  try {
    for (const step of steps) {
      await input.onEvent?.({
        eventType: "tool_call_requested",
        title: step.title,
        summary: `Starting ${step.type.replace("_", " ")} step.`,
        runId: parentRun.id,
        severity: step.requiresApproval ? "warning" : "info",
        payload: { step, previousSteps: stepResults },
      });

      if (step.type === "research") {
        const result = await runResearchRuntime({
          userId: input.userId,
          workspaceId: input.workspaceId ?? null,
          query: step.task,
          context: { parentRunId: parentRun.id, ...input.context },
        });
        stepResults.push({ step, runId: result.run.id, status: result.run.status, result: result.result ?? null });
        await input.onEvent?.({
          eventType: "tool_call_completed",
          title: "Research completed",
          summary: result.run.summary ?? "Research runtime completed.",
          runId: result.run.id,
          severity: result.run.status === "failed" ? "danger" : "success",
          payload: { step, result },
        });
      }

      if (step.type === "software_execution" && step.toolId) {
        if (step.toolId.startsWith("universal:")) {
          const capability = step.toolId.slice("universal:".length);
          const path =
            mcpPaths.find((candidate) => candidate.capability === capability) ??
            nativePaths.find((candidate) => candidate.capability === capability);

          if (!path) {
            // The plan-building pass above resolved a connected path, but by
            // the time this step runs the resolution disagrees (stale intent
            // carried a toolId forward, a connection was removed mid-run,
            // etc). This used to be passed straight into executeUniversalMcpPath
            // unguarded and crash the whole run with "Cannot read properties
            // of undefined" - fail just this step instead.
            stepResults.push({ step, status: "failed", error: `No connected execution path is available for ${capability}.` });
            await input.onEvent?.({
              eventType: "tool_call_completed",
              title: "Connected software unavailable",
              summary: `No connected execution path is available for ${capability}.`,
              runId: parentRun.id,
              severity: "danger",
              payload: { step },
            });
          } else if (path.kind === "native") {
            const result = await executeNativeCapabilityPath({
              userId: input.userId,
              workspaceId: input.workspaceId ?? null,
              prompt: step.task,
              context: { parentRunId: parentRun.id, previousSteps: stepResults, ...input.context },
              path,
              intent: commandPlan.intent,
            });
            stepResults.push({ step, runId: result.run.id, status: result.run.status, path });
            await input.onEvent?.({
              eventType: "tool_call_completed",
              title: "Connected software completed",
              summary: result.run.summary ?? "Connected software path completed.",
              runId: result.run.id,
              severity: result.run.status === "failed" ? "danger" : "success",
              payload: { step, result, path },
            });
          } else {
            if (path.approvalRequired && !input.approved) {
              const approval = await createRuntimeApproval({
                userId: input.userId,
                workspaceId: input.workspaceId ?? null,
                runId: parentRun.id,
                title: `Approve ${path.label}`,
                message: `Dobly found a connected software path for: ${input.prompt}. Approve before it acts inside ${path.connection?.label ?? "the connected tool"}.`,
                actionLabel: "Approve and run",
                riskLevel: path.riskLevel,
                metadata: {
                  resume: { type: "runtime_command", prompt: input.prompt, context: input.context ?? {}, intent: commandPlan.intent },
                  path,
                  previousSteps: stepResults,
                },
              });
              stepResults.push({ step, approvalId: approval.id, status: "needs_approval", path });
              await input.onEvent?.({
                eventType: "approval_requested",
                title: approval.title,
                summary: approval.message,
                runId: parentRun.id,
                approvalId: approval.id,
                severity: "warning",
                payload: { step, approval, path },
              });
              break;
            }
            const result = await executeUniversalMcpPath({
              userId: input.userId,
              workspaceId: input.workspaceId ?? null,
              prompt: step.task,
              context: { parentRunId: parentRun.id, previousSteps: stepResults, ...input.context },
              path,
              approved: input.approved ?? false,
              intent: commandPlan.intent,
            });
            stepResults.push({ step, runId: result.run.id, status: result.run.status, path });
            await input.onEvent?.({
              eventType: "tool_call_completed",
              title: "Connected software completed",
              summary: result.run.summary ?? "Connected software path completed.",
              runId: result.run.id,
              severity: result.run.status === "failed" ? "danger" : "success",
              payload: { step, result, path },
            });
          }
        } else {
          const result = await createSoftwareExecutionRun({
            userId: input.userId,
            workspaceId: input.workspaceId ?? null,
            toolId: step.toolId,
            task: step.task,
            context: { parentRunId: parentRun.id, previousSteps: stepResults, ...input.context },
            approved: input.approved ?? false,
            intent: commandPlan.intent,
          });
          stepResults.push({ step, runId: result.run.id, status: result.run.status });
          await input.onEvent?.({
            eventType: result.run.approval_required ? "approval_requested" : "tool_call_completed",
            title: result.run.approval_required ? "Software approval requested" : "Software execution prepared",
            summary: result.run.summary ?? "Software execution run created.",
            runId: result.run.id,
            severity: result.run.approval_required ? "warning" : "success",
            payload: { step, result },
          });
        }
      }

      if (step.type === "custom_api" && step.customApiActionId) {
        const path = customApiPaths.find((candidate) => candidate.action.id === step.customApiActionId) ?? customApiPaths[0];
        const result = await executeCustomApiAction({
          userId: input.userId,
          workspaceId: input.workspaceId ?? null,
          actionId: step.customApiActionId,
          prompt: step.task,
          input: { prompt: step.task, context: input.context ?? {}, previousSteps: stepResults },
          approved: input.approved ?? false,
        });
        stepResults.push({
          step,
          runId: result.run.id,
          status: result.approval ? "needs_approval" : result.run.status,
          path,
        });
        await input.onEvent?.({
          eventType: result.approval ? "approval_requested" : "tool_call_completed",
          title: result.approval ? result.approval.title : "Custom API completed",
          summary: result.approval?.message ?? result.run.summary ?? "Custom API action completed.",
          runId: result.run.id,
          approvalId: result.approval?.id ?? null,
          severity: result.approval ? "warning" : result.run.status === "failed" ? "danger" : "success",
          payload: { step, result, path },
        });
        if (result.approval) break;
      }

      if (step.type === "media") {
        const result = await runMediaRuntime({
          userId: input.userId,
          workspaceId: input.workspaceId ?? null,
          brief: step.task,
          publish: false,
        });
        stepResults.push({ step, runId: result.run.id, status: result.run.status, result: result.result ?? null });
        await input.onEvent?.({
          eventType: "artifact_created",
          title: "Media package prepared",
          summary: result.run.summary ?? "Media runtime completed.",
          runId: result.run.id,
          severity: result.run.status === "failed" ? "danger" : "success",
          payload: { step, result },
        });
      }

      if (step.type === "memory_synthesis") {
        const result = await runMemorySynthesis({
          userId: input.userId,
          workspaceId: input.workspaceId ?? null,
          scope: "all",
          writeBack: Boolean(input.context?.writeBackMemory),
        });
        stepResults.push({ step, runId: result.run.id, status: result.run.status, result: result.result ?? null });
        await input.onEvent?.({
          eventType: "memory_proposed",
          title: "Memory synthesis completed",
          summary: result.run.summary ?? "Memory synthesis runtime completed.",
          runId: result.run.id,
          severity: result.run.status === "failed" ? "danger" : "success",
          payload: { step, result },
        });
      }

      if (step.type === "approval") {
        // This never checked input.approved, unlike every other approval gate
        // in this file (software_execution's path.approvalRequired check,
        // custom_api's result.approval check). Since resuming an approved run
        // re-invokes this whole function and rebuilds the same plan from
        // scratch (job-processor.ts's "runtime_command" resume handler), an
        // unconditional gate here meant clicking "Approve" on any send/
        // publish/pay/invoice-shaped request just created ANOTHER pending
        // approval and broke again - the real action (the software_execution
        // step spliced in right after this one, or delivery_package below)
        // could never be reached, approved or not.
        if (!input.approved) {
          const approval = await createRuntimeApproval({
            userId: input.userId,
            workspaceId: input.workspaceId ?? null,
            runId: parentRun.id,
            title: "Approve external action",
            message: `Dobly prepared work for: ${input.prompt}. Approve before Dobly sends, publishes, pays, or changes an external system.`,
            actionLabel: "Approve and resume",
            riskLevel: "high",
            metadata: {
              resume: {
                type: "runtime_command",
                prompt: input.prompt,
                context: input.context ?? {},
                intent: commandPlan.intent,
              },
              previousSteps: stepResults,
            },
          });
          stepResults.push({ step, approvalId: approval.id, status: "needs_approval" });
          await input.onEvent?.({
            eventType: "approval_requested",
            title: approval.title,
            summary: approval.message,
            runId: parentRun.id,
            approvalId: approval.id,
            severity: "warning",
            payload: { step, approval },
          });
          break;
        }
        stepResults.push({ step, status: "approved" });
      }

      if (step.type === "delivery_package") {
        // Marketing's "publish" gap: content publishing has no connected-
        // provider capability of its own (unlike send_message/manage_calendar/
        // etc.), so it always fell through to this generic stub - which never
        // called anything real even once the approval bug above was fixed.
        // Dispatch to the real cross-platform publishing runtime (real HTTP
        // calls to X/LinkedIn/Instagram/Facebook, using Dobly's own configured
        // credentials) when the prompt is actually a publish request.
        const lowerPrompt = input.prompt.toLowerCase();
        const isPublishRequest = /\bpublish\b|\bpost\b|\bsocial media\b|\binstagram\b|\bfacebook\b|\blinkedin\b|\btiktok\b|\bx\.com\b|\btwitter\b|\byoutube\b/.test(lowerPrompt);
        if (isPublishRequest) {
          const allProviders: Array<"instagram" | "facebook" | "linkedin" | "x" | "youtube" | "tiktok"> = ["instagram", "facebook", "linkedin", "x", "youtube", "tiktok"];
          const mentionedProviders = allProviders.filter((provider) =>
            lowerPrompt.includes(provider) || (provider === "x" && /\btwitter\b|\bx\.com\b/.test(lowerPrompt)),
          );
          const providers = mentionedProviders.length ? mentionedProviders : (["instagram"] as Array<"instagram" | "facebook" | "linkedin" | "x" | "youtube" | "tiktok">);
          const mediaUrls = Array.isArray(input.context?.mediaUrls) ? (input.context!.mediaUrls as string[]) : [];
          const publishResult = await executePublishingRuntime({
            userId: input.userId,
            workspaceId: input.workspaceId ?? null,
            providers,
            caption: input.prompt,
            mediaUrls,
            approved: input.approved ?? false,
          });
          stepResults.push({ step, runId: publishResult.run.id, status: publishResult.run.status, result: publishResult });
          await input.onEvent?.({
            eventType: "tool_call_completed",
            title: "Publishing completed",
            summary: publishResult.run.summary ?? "Cross-platform publishing runtime completed.",
            runId: publishResult.run.id,
            severity: publishResult.run.status === "failed" ? "danger" : "success",
            payload: { step, result: publishResult },
          });
        } else {
          stepResults.push({
            step,
            status: "prepared",
            result: {
              note: "Delivery package prepared. Live sending/publishing should run only after approval and connector readiness checks.",
            },
          });
          await input.onEvent?.({
            eventType: "artifact_created",
            title: "Delivery package prepared",
            summary: "Dobly prepared the delivery package and kept external action approval-gated.",
            runId: parentRun.id,
            severity: "success",
            payload: { step },
          });
        }
      }
    }

    const terminalStatus = stepResults.some((item) => item.status === "needs_approval")
      ? "completed"
      : stepResults.some((item) => item.status === "failed")
        ? "failed"
        : "completed";

    const artifact = await createDurableArtifact({
      runId: parentRun.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "json",
      // Was a hardcoded "Multi-step command plan and results" for every
      // run regardless of what was actually asked - every approval and
      // artifact list built from this title looked like the exact same
      // repeated item, when they were really distinct runs on different
      // days. Derive it from the actual prompt instead.
      title: summarizeCommandTitle(input.prompt),
      content: { prompt: input.prompt, steps, stepResults },
      metadata: { workerId: input.workerId ?? null },
    });
    await input.onEvent?.({
      eventType: "artifact_created",
      title: artifact.title,
      summary: "A versioned artifact was attached to this Operator run.",
      runId: parentRun.id,
      artifactId: artifact.id,
      severity: "success",
      payload: { artifact },
    });

    const completed = await completeDurableRuntimeRun({
      runId: parentRun.id,
      userId: input.userId,
      status: terminalStatus,
      summary: stepResults.some((item) => item.status === "needs_approval")
        ? "Dobly completed the safe preparation steps and is waiting for approval before external action."
        : `Dobly completed ${stepResults.length} command step(s).`,
      result: { steps, stepResults, artifactId: artifact.id },
    });

    await input.onEvent?.({
      eventType: completed.status === "failed" ? "run_failed" : "run_completed",
      title: completed.status === "failed" ? "Run failed" : "Run completed",
      summary: completed.summary ?? "Operator run completed.",
      runId: completed.id,
      severity: completed.status === "failed" ? "danger" : stepResults.some((item) => item.status === "needs_approval") ? "warning" : "success",
      payload: { completed, steps, stepResults, artifactId: artifact.id },
    });

    return { run: completed, artifacts: [artifact], steps, stepResults };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Multi-step command failed.";
    const failed = await completeDurableRuntimeRun({
      runId: parentRun.id,
      userId: input.userId,
      status: message.includes("not configured") ? "not_configured" : "failed",
      summary: message,
      errorMessage: message,
      result: { steps, stepResults },
    });
    await input.onEvent?.({
      eventType: "run_failed",
      title: "Run failed",
      summary: message,
      runId: failed.id,
      severity: "danger",
      payload: { steps, stepResults, error: message },
    });
    return { run: failed, artifacts: [], steps, stepResults, error: message };
  }
}
