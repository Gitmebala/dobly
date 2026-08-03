import "server-only";
import { completeDurableRuntimeRun, createDurableArtifact, createDurableRuntimeRun } from "@/lib/runtime/durable-runtime";
import { executeDynamicClaudeMcpStep } from "@/lib/claude-mcp";
import { decryptStoredMcpToken, resolveUniversalExecutionPaths, getCapabilityNativeToolCandidates, type UniversalExecutionPath } from "@/lib/runtime/universal-mcp";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import type { DoblyExecutionIntent } from "@/lib/dobly-inference";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { McpConnectionRecord } from "@/lib/runtime/universal-mcp";
import { assertSafeOutboundUrl } from "@/lib/security/safe-fetch";
import { assertEmergencyStopInactive } from "@/lib/feature-flags";
import { anthropic } from "@/lib/anthropic";
import { executeNativeConnectorTool, findNativeExecutorId } from "@/lib/office/native-tool-bridge";
import { findLiveConnectionForProvider } from "@/lib/provider-aliases";

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

// Coworker chat and every ad-hoc `dobly_operators` command run through
// `multi-step-command.ts`, which used to only know how to dispatch a
// `kind: "mcp"` path from resolveUniversalExecutionPaths. A `kind: "native"`
// path (a real, live Gmail/Calendar/Drive/M-Pesa/Paystack/HubSpot/voice
// connection - see office/native-tool-bridge.ts, the same executors the
// office/department engine already used) was resolved correctly but nothing
// ever executed it from this path, so it silently never ran for real.
const NATIVE_TOOL_ARG_SCHEMAS: Record<string, string> = {
  gmail: `{"to": "email address", "subject": "string", "text": "plain text body"}`,
  google_docs: `{"title": "string", "content": "string"}`,
  google_calendar: `{"summary": "string", "description": "string", "start": "ISO 8601 datetime", "end": "ISO 8601 datetime", "attendees": ["email", "..."] (omit if none), "location": "string (omit if none)"}`,
  calendar_check_availability: `{"start": "ISO 8601 datetime - the beginning of the window to check", "end": "ISO 8601 datetime - the end of the window to check"}`,
  google_drive: `{"fileId": "the Google Drive file id being organized - check prior step results for a documentId/fileId if the user didn't give one literally", "folderName": "destination folder name", "rename": "new file name (omit if not renaming)"}`,
  mpesa: `{"phoneNumber": "e.g. 2547XXXXXXXX", "amount": number, "accountReference": "string", "transactionDesc": "string"}`,
  paystack: `{"email": "customer email", "amount": number, "currency": "3-letter code, default KES"}`,
  hubspot: `{"email": "string", "firstName": "string", "lastName": "string"}`,
  voice: `{"to": "phone number in E.164 format", "objective": "what the call should accomplish"}`,
};

async function extractNativeToolArguments(input: {
  toolName: string;
  prompt: string;
  context?: JsonRecord;
}): Promise<JsonRecord> {
  const schema = NATIVE_TOOL_ARG_SCHEMAS[input.toolName];
  if (!schema || !process.env.ANTHROPIC_API_KEY) return {};

  try {
    const message = await anthropic.messages.create({
      model: process.env.DOBLY_TOOL_MODEL || process.env.DOBLY_PREMIUM_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 500,
      system:
        "Extract structured arguments for a software action from the user's request. Reply with ONLY a single JSON object matching the given shape - no prose, no markdown fences. Fields described as required must always be filled - resolve relative dates/times (\"tomorrow\", \"next Monday\", \"2pm\") against the current time given below; if the user didn't state a timezone, use the current time's own UTC offset rather than leaving the field out. Only omit fields explicitly marked optional/omittable, and only when truly nothing in the request or prior context suggests a value.",
      messages: [
        {
          role: "user",
          content: [
            `Current time: ${new Date().toISOString()}`,
            `Target shape (fields not marked optional/omittable are required): ${schema}`,
            `User request: ${input.prompt}`,
            `Prior step results (may contain ids to reuse, e.g. a fileId from a just-created document): ${JSON.stringify(input.context ?? {}).slice(0, 4000)}`,
          ].join("\n\n"),
        },
      ],
    });
    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(jsonText);
    return typeof parsed === "object" && parsed !== null ? (parsed as JsonRecord) : {};
  } catch (error) {
    // A silent {} here reads identically to "the model correctly found
    // nothing to fill in" - it isn't. Log so a downstream "requires X and Y"
    // failure can be told apart from an extraction call that never worked.
    console.error(`extractNativeToolArguments failed for ${input.toolName}:`, error);
    return {};
  }
}

export async function executeNativeCapabilityPath(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  context?: JsonRecord;
  path: UniversalExecutionPath;
  intent?: DoblyExecutionIntent | null;
}) {
  assertEmergencyStopInactive("external_actions");
  const path = input.path;

  const candidates = getCapabilityNativeToolCandidates(path.capability);
  let toolName: string | null = null;
  for (const candidate of candidates) {
    if (!findNativeExecutorId(candidate.toolName)) continue;
    if (candidate.toolName === "make_call") {
      toolName = candidate.toolName;
      break;
    }
    const connection = await findLiveConnectionForProvider(input.userId, candidate.provider).catch(() => null);
    if (connection) {
      toolName = candidate.toolName;
      break;
    }
  }
  if (!toolName) {
    throw new Error(`No live native connector is available for ${path.capability}.`);
  }

  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: `native:${toolName}`,
    toolLabel: path.label,
    toolFamily: "native_connector",
    task: input.prompt,
    riskLevel: path.riskLevel,
    context: { capability: path.capability, toolName, ...(input.context ?? {}) },
    intent: input.intent ?? null,
  });

  const estimatedMinor = 200;
  const reservation = await reserveOperatingCapacity({
    userId: input.userId,
    workspaceId: input.workspaceId,
    capability: "ai.reasoning",
    provider: "anthropic",
    estimatedMinor,
    idempotencyKey: `native:${run.id}:${toolName}`,
    runId: run.id,
    metadata: { capability: path.capability, toolName },
  });

  try {
    const toolPayload = await extractNativeToolArguments({
      toolName,
      prompt: input.prompt,
      context: input.context,
    });

    const result = await executeNativeConnectorTool({
      userId: input.userId,
      taskId: run.id,
      toolName,
      toolPayload,
    });

    if (!result.ok) throw new Error(result.error);

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "json",
      title: `${path.label} result`,
      content: { toolPayload, output: result.output },
      metadata: { capability: path.capability, toolName },
      intent: input.intent ?? null,
    });

    await logRuntimeAuditEvent({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      runId: run.id,
      eventType: "native_connector.executed",
      riskLevel: path.riskLevel,
      summary: `Executed ${path.label} via native connector ${toolName}.`,
      metadata: { capability: path.capability, toolName, toolPayload },
    }).catch(() => undefined);

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: `${path.label} ran for real via ${result.provider}.`,
      result: { path, toolPayload, output: result.output, artifactId: artifact.id },
    });
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimatedMinor,
      status: "succeeded",
      metadata: { toolName },
    });
    return { run: completed, artifacts: [artifact], path, result: result.output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Native connector execution failed.";
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
      metadata: { error: message, toolName },
    }).catch(() => undefined);
    return { run: failed, artifacts: [], path, error: message };
  }
}
