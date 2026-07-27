import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { executeAgentToolOperation } from "@/lib/agents/tool-operation";
import { sendCommunicationReply } from "@/lib/communications/runtime";
import { getDecryptedConnectionSecrets } from "@/lib/connections";
import { executeRealInternalTool } from "@/lib/office/internal-tool-handlers";
import { executeNativeConnectorTool, findNativeExecutorId } from "@/lib/office/native-tool-bridge";
import { connectionMatchesProvider } from "@/lib/provider-aliases";

export type OfficeToolExecutionStatus = "completed" | "needs_connection" | "unsupported" | "failed";

export interface OfficeToolExecutionResult {
  status: OfficeToolExecutionStatus;
  summary: string;
  output: Record<string, unknown>;
}

export interface OfficeToolExecutionInput {
  userId: string;
  workspaceId?: string | null;
  taskId: string;
  toolName: string | null;
  toolPayload: Record<string, unknown>;
}

const INTERNAL_TOOLS = new Set([
  "message_classifier",
  "lead_qualifier",
  "calendar_check",
  "payment_checker",
  "reminder_scheduler",
  "invoice_generator",
  "ticket_classifier",
  "knowledge_base_search",
  "resolution_recommender",
  "data_analyzer",
  "pattern_detector",
  "opportunity_scorer",
  "inventory_monitor",
  "supplier_tracker",
  "order_processor",
]);


export async function executeOfficeTool(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  if (input.toolName?.startsWith("claude_mcp:") || input.toolName === "agent_tool_operation") {
    const result = await executeAgentToolOperation({
      userId: input.userId,
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      toolName: String(input.toolPayload.toolName ?? input.toolName),
      task: String(input.toolPayload.task ?? input.toolPayload.summary ?? "Complete the assigned Dobly tool-operation step."),
      context: input.toolPayload,
      mcpServerUrl: typeof input.toolPayload.mcpServerUrl === "string" ? input.toolPayload.mcpServerUrl : null,
    });
    return logToolExecution(input, "agent_tool_operation", result);
  }

  if (input.toolName === "communication_reply") {
    const result = await executeCommunicationReplyTool(input);
    return logToolExecution(input, "communication_reply", result);
  }

  if (!input.toolName) {
    const result: OfficeToolExecutionResult = {
      status: "completed",
      summary: "No external tool was required; the task completed inside Homebase.",
      output: { mode: "homebase_internal" },
    };
    return logToolExecution(input, "homebase_internal", result);
  }

  const normalizedTool = input.toolName.toLowerCase();

  if (INTERNAL_TOOLS.has(normalizedTool)) {
    const result = await executeInternalTool(input, normalizedTool);
    return logToolExecution(input, normalizedTool, result);
  }

  const connection = await findConnectionForTool(input.userId, normalizedTool);
  if (!connection) {
    const result: OfficeToolExecutionResult = {
      status: "needs_connection",
      summary: `${input.toolName} is not connected yet, so Dobly prepared the action but did not send it externally.`,
      output: { toolName: input.toolName, preparedPayload: input.toolPayload },
    };
    return logToolExecution(input, input.toolName, result);
  }

  // Prefer a real native executor (Gmail send, Sheets append, Slack post, ...)
  // over the webhook/base_url fallback. Without this, a genuinely connected
  // OAuth account still fell through to "prepared_not_sent" because an OAuth
  // connection has neither a webhook_url nor a base_url in its metadata.
  if (findNativeExecutorId(normalizedTool)) {
    const native = await executeNativeConnectorTool({
      userId: input.userId,
      taskId: input.taskId,
      toolName: normalizedTool,
      toolPayload: input.toolPayload,
    });

    if (native.ok) {
      return logToolExecution(input, native.provider, {
        status: "completed",
        summary: `${input.toolName} ran for real via ${native.provider}.`,
        output: native.output,
      });
    }

    return logToolExecution(input, String(connection.provider ?? normalizedTool), {
      status: "failed",
      summary: `${input.toolName} could not complete: ${native.error}`,
      output: { toolName: input.toolName, error: native.error, payload: input.toolPayload },
    });
  }

  const result = await executeConnectedTool(input, connection);
  return logToolExecution(input, String(connection.provider ?? input.toolName ?? "external"), result);
}

async function logToolExecution(
  input: OfficeToolExecutionInput,
  provider: string,
  result: OfficeToolExecutionResult,
) {
  const admin = createAdminSupabaseClient();
  try {
    await admin
      .from("external_action_executions")
      .insert({
        workspace_id: input.workspaceId ?? null,
        user_id: input.userId,
        office_task_id: input.taskId,
        provider,
        tool_name: input.toolName,
        status: result.status,
        request_payload: input.toolPayload,
        response_payload: result.output,
        summary: result.summary,
        idempotency_key: `${input.taskId}:${input.toolName ?? provider}`,
        completed_at: new Date().toISOString(),
      });
  } catch {
    // Older workspaces can run before the audit table is applied.
  }
  return result;
}

async function executeCommunicationReplyTool(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const channel = String(input.toolPayload.channel ?? "");
  const to = String(input.toolPayload.to ?? "");
  const body = String(input.toolPayload.body ?? "");
  const from = typeof input.toolPayload.from === "string" ? input.toolPayload.from : null;

  if (!["sms", "whatsapp", "email", "website_chat", "voice"].includes(channel) || !to || !body) {
    return {
      status: "failed",
      summary: "Communication reply payload is missing channel, recipient, or body.",
      output: { payload: input.toolPayload },
    };
  }

  const result = await sendCommunicationReply({
    userId: input.userId,
    taskId: input.taskId,
    channel: channel as "sms" | "whatsapp" | "email" | "website_chat" | "voice",
    to,
    from,
    body,
  });

  return {
    status: result.status,
    summary: result.summary,
    output: result,
  };
}

async function executeInternalTool(input: OfficeToolExecutionInput, toolName: string): Promise<OfficeToolExecutionResult> {
  return executeRealInternalTool(input, toolName);
}

async function findConnectionForTool(userId: string, toolName: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "connected"])
    .limit(50);

  if (error) return null;

  return (data ?? []).find((connection: Record<string, unknown>) =>
    connectionMatchesProvider(connection.provider, toolName),
  ) as Record<string, unknown> | undefined;
}

async function executeConnectedTool(
  input: OfficeToolExecutionInput,
  connection: Record<string, unknown>,
): Promise<OfficeToolExecutionResult> {
  const provider = String(connection.provider ?? input.toolName ?? "external");
  const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
  const webhookUrl = typeof metadata.webhook_url === "string" ? metadata.webhook_url : null;

  if (!webhookUrl) {
    const baseUrl = typeof metadata.base_url === "string"
      ? metadata.base_url
      : typeof metadata.baseUrl === "string"
      ? metadata.baseUrl
      : null;

    if (baseUrl) {
      return executeGenericApiAction(input, connection, baseUrl);
    }

    return {
      status: "needs_connection",
      summary: `${provider} is connected, but no execution endpoint is configured yet. Dobly prepared the action and kept it inside Homebase.`,
      output: {
        provider,
        connectionId: connection.id,
        externalDispatch: "prepared_not_sent",
        payload: input.toolPayload,
      },
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "dobly.homebase",
        taskId: input.taskId,
        toolName: input.toolName,
        payload: input.toolPayload,
      }),
    });

    return {
      status: response.ok ? "completed" : "failed",
      summary: response.ok
        ? `${provider} accepted the external action.`
        : `${provider} returned ${response.status} while executing the action.`,
      output: {
        provider,
        connectionId: connection.id,
        status: response.status,
        ok: response.ok,
      },
    };
  } catch (error) {
    return {
      status: "failed",
      summary: error instanceof Error ? error.message : `${provider} execution failed.`,
      output: {
        provider,
        connectionId: connection.id,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

async function executeGenericApiAction(
  input: OfficeToolExecutionInput,
  connection: Record<string, unknown>,
  baseUrl: string,
): Promise<OfficeToolExecutionResult> {
  const provider = String(connection.provider ?? input.toolName ?? "external");
  const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
  const secrets = await getDecryptedConnectionSecrets(String(connection.id)).catch(() => null);
  const token =
    secrets?.accessToken ??
    (typeof metadata.access_token === "string"
      ? metadata.access_token
      : typeof metadata.accessToken === "string"
      ? metadata.accessToken
      : null);
  const actionPath = typeof metadata.action_path === "string" ? metadata.action_path : "/actions";
  const endpoint = new URL(actionPath, baseUrl).toString();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        source: "dobly.homebase",
        taskId: input.taskId,
        toolName: input.toolName,
        payload: input.toolPayload,
      }),
    });
    const data = await response.json().catch(() => ({}));

    return {
      status: response.ok ? "completed" : "failed",
      summary: response.ok
        ? `${provider} accepted the Dobly action through its API endpoint.`
        : `${provider} returned ${response.status} from its API endpoint.`,
      output: {
        provider,
        connectionId: connection.id,
        endpoint,
        status: response.status,
        ok: response.ok,
        data,
      },
    };
  } catch (error) {
    return {
      status: "failed",
      summary: error instanceof Error ? error.message : `${provider} API execution failed.`,
      output: {
        provider,
        connectionId: connection.id,
        endpoint,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}
