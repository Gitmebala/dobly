import "server-only";
import { completeDurableRuntimeRun, createDurableArtifact, createDurableRuntimeRun } from "@/lib/runtime/durable-runtime";
import { executeDynamicClaudeMcpStep } from "@/lib/claude-mcp";
import { decryptStoredMcpToken, resolveUniversalExecutionPaths, type UniversalExecutionPath } from "@/lib/runtime/universal-mcp";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import type { DoblyExecutionIntent } from "@/lib/dobly-inference";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { McpConnectionRecord } from "@/lib/runtime/universal-mcp";
import { assertSafeOutboundUrl } from "@/lib/security/safe-fetch";
import { assertEmergencyStopInactive } from "@/lib/feature-flags";

type JsonRecord = Record<string, unknown>;

export async function executeUniversalMcpPath(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  context?: JsonRecord;
  path?: UniversalExecutionPath | null;
  approved?: boolean;
  intent?: DoblyExecutionIntent | null;
}) {
  assertEmergencyStopInactive("external_actions");
  const resolved = input.path
    ? { paths: [input.path] }
    : await resolveUniversalExecutionPaths({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        prompt: input.prompt,
      });
  const path = resolved.paths.find((candidate) => candidate.kind === "mcp");

  if (!path?.connection || !path.tool) {
    throw new Error("No connected MCP execution path is available for this request.");
  }

  const admin = createAdminSupabaseClient();
  const { data: connectionRow } = await admin.from("mcp_connections").select("*")
    .eq("id", path.connection.id).eq("user_id", input.userId).eq("status", "active").maybeSingle();
  if (!connectionRow) throw new Error("The MCP connection is unavailable or access was denied.");
  const liveConnection = connectionRow as McpConnectionRecord;
  await assertSafeOutboundUrl(liveConnection.server_url);

  if (path.approvalRequired && !input.approved) {
    throw new Error("This MCP execution path requires approval before running.");
  }

  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: `mcp:${path.connection.id}:${path.tool.name}`,
    toolLabel: path.label,
    toolFamily: "universal_mcp",
    task: input.prompt,
    riskLevel: path.riskLevel,
    context: { capability: path.capability, connectionId: path.connection.id, toolName: path.tool.name, ...(input.context ?? {}) },
    intent: input.intent ?? null,
  });
  const estimatedMinor = 350;
  const reservation = await reserveOperatingCapacity({
    userId: input.userId,
    workspaceId: input.workspaceId,
    capability: "ai.reasoning",
    provider: "anthropic",
    estimatedMinor,
    idempotencyKey: `mcp:${run.id}:${path.connection.id}:${path.tool.name}`,
    runId: run.id,
    metadata: {
      capability: path.capability,
      connectionId: path.connection.id,
      toolName: path.tool.name,
      approvedCost: Boolean(input.approved),
    },
  });

  try {
    const result = await executeDynamicClaudeMcpStep({
      task: input.prompt,
      context: {
        ...input.context,
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        capability: path.capability,
        doblyRuntime: "universal_mcp",
      },
      serverName: `mcp_${path.connection.id.replace(/-/g, "_")}`,
      serverUrl: liveConnection.server_url,
      authToken: decryptStoredMcpToken(liveConnection.auth_token_encrypted),
      allowedTools: [path.tool.name],
    });

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "mcp_result",
      title: `${path.label} result`,
      content: {
        summary: result.summary,
        text: result.text,
        rawContent: result.rawContent,
        usage: result.usage ?? null,
      },
      metadata: { capability: path.capability, connectionId: path.connection.id, toolName: path.tool.name },
      intent: input.intent ?? null,
    });

    await logRuntimeAuditEvent({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      runId: run.id,
      eventType: "universal_mcp.executed",
      riskLevel: path.riskLevel,
      summary: `Executed ${path.label}.`,
      metadata: { capability: path.capability, connectionId: path.connection.id, toolName: path.tool.name },
    }).catch(() => undefined);

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: result.summary,
      result: { path, result, artifactId: artifact.id },
    });
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimatedMinor,
      status: "succeeded",
      metadata: { usage: result.usage ?? null, connectionId: path.connection.id, toolName: path.tool.name },
    });
    return { run: completed, artifacts: [artifact], path, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Universal MCP execution failed.";
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "failed",
      summary: message,
      errorMessage: message,
    });
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: failedProviderCharge({ paidRail: true, estimatedMinor, errorMessage: message }),
      status: "failed",
      metadata: { error: message, connectionId: path.connection.id, toolName: path.tool.name },
    }).catch(() => undefined);
    return { run: failed, artifacts: [], path, error: message };
  }
}
