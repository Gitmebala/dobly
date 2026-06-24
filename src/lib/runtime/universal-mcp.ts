import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { inferCapabilitiesFromText, getCapabilityDefinition, type DoblyCapability } from "@/lib/runtime/capabilities";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { assertSafeOutboundUrl, safeOutboundFetch } from "@/lib/security/safe-fetch";

type JsonRecord = Record<string, unknown>;

function asDoblyCapability(value: string): DoblyCapability | null {
  return getCapabilityDefinition(value) ? (value as DoblyCapability) : null;
}

export interface McpConnectionRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  label: string;
  server_url: string;
  auth_token_ref: string | null;
  auth_token_encrypted: string | null;
  status: "active" | "paused" | "error" | "archived";
  capability_tags: string[];
  risk_profile: "low" | "medium" | "high";
  approval_required: boolean;
  metadata: JsonRecord;
  last_discovered_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface McpDiscoveredToolRecord {
  id: string;
  connection_id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  label: string;
  description: string;
  input_schema: JsonRecord;
  capability_hints: string[];
  risk_level: "low" | "medium" | "high";
  approval_required: boolean;
  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
}

export interface UniversalExecutionPath {
  kind: "mcp" | "native" | "internal" | "fallback";
  capability: DoblyCapability;
  label: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  approvalRequired: boolean;
  connection?: McpConnectionRecord;
  tool?: McpDiscoveredToolRecord;
  reason: string;
}

function normalizeCapabilityHints(input: unknown, fallbackText = "") {
  const fromArray = Array.isArray(input) ? input.map(String) : [];
  const inferred = inferCapabilitiesFromText(`${fromArray.join(" ")} ${fallbackText}`);
  return Array.from(new Set([...fromArray, ...inferred])).slice(0, 12);
}

export function decryptStoredMcpToken(value: string | null | undefined) {
  if (!value) return null;
  try {
    return decryptSecret(value);
  } catch {
    // Older development rows stored this field in plaintext. Keep them usable
    // while all newly created rows are encrypted.
    return value;
  }
}

function redactMcpConnection(connection: McpConnectionRecord) {
  return { ...connection, auth_token_encrypted: null, has_auth_token: Boolean(connection.auth_token_encrypted) };
}

async function mcpJsonRpc(params: {
  serverUrl: string;
  authToken?: string | null;
  method: string;
  params?: JsonRecord;
}) {
  const { response, text } = await safeOutboundFetch(params.serverUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(params.authToken ? { authorization: `Bearer ${params.authToken}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}`,
      method: params.method,
      params: params.params ?? {},
    }),
  }, { maxResponseBytes: 2 * 1024 * 1024 });

  const data = (() => { try { return JSON.parse(text) as JsonRecord; } catch { return null; } })();
  if (!response.ok) {
    throw new Error(`MCP ${params.method} failed with ${response.status}: ${JSON.stringify(data)}`);
  }
  if (data?.error) {
    throw new Error(`MCP ${params.method} failed: ${JSON.stringify(data.error)}`);
  }
  return (data?.result ?? data ?? {}) as JsonRecord;
}

export async function createUniversalMcpConnection(input: {
  userId: string;
  workspaceId?: string | null;
  label: string;
  serverUrl: string;
  authToken?: string | null;
  capabilityTags?: string[];
  riskProfile?: "low" | "medium" | "high";
  approvalRequired?: boolean;
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  const serverUrl = await assertSafeOutboundUrl(input.serverUrl);
  const capabilityTags = normalizeCapabilityHints(input.capabilityTags, input.label);
  const { data, error } = await admin
    .from("mcp_connections")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      label: input.label,
      server_url: serverUrl.toString(),
      auth_token_encrypted: input.authToken ? encryptSecret(input.authToken) : null,
      capability_tags: capabilityTags,
      risk_profile: input.riskProfile ?? "medium",
      approval_required: input.approvalRequired ?? true,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create MCP connection.");
  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    eventType: "mcp.connection.created",
    riskLevel: input.riskProfile ?? "medium",
    summary: `MCP connection created: ${input.label}`,
    metadata: { capabilityTags, serverOrigin: serverUrl.origin },
  }).catch(() => undefined);
  return redactMcpConnection(data as McpConnectionRecord);
}

export async function listUniversalMcpConnections(input: {
  userId: string;
  workspaceId?: string | null;
  includeTools?: boolean;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("mcp_connections")
    .select("*")
    .eq("user_id", input.userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const connections = (data ?? []) as McpConnectionRecord[];
  if (!input.includeTools) return connections.map(redactMcpConnection);

  const ids = connections.map((item) => item.id);
  const tools = ids.length
    ? await admin.from("mcp_discovered_tools").select("*").in("connection_id", ids)
    : { data: [] };
  const byConnection = new Map<string, McpDiscoveredToolRecord[]>();
  for (const tool of (tools.data ?? []) as McpDiscoveredToolRecord[]) {
    byConnection.set(tool.connection_id, [...(byConnection.get(tool.connection_id) ?? []), tool]);
  }
  return connections.map((connection) => ({ ...redactMcpConnection(connection), tools: byConnection.get(connection.id) ?? [] }));
}

export async function discoverUniversalMcpTools(input: {
  userId: string;
  connectionId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: connection, error } = await admin
    .from("mcp_connections")
    .select("*")
    .eq("id", input.connectionId)
    .eq("user_id", input.userId)
    .single();
  if (error || !connection) throw new Error(error?.message ?? "MCP connection not found.");

  const row = connection as McpConnectionRecord;
  try {
    const result = await mcpJsonRpc({
      serverUrl: row.server_url,
      authToken: decryptStoredMcpToken(row.auth_token_encrypted),
      method: "tools/list",
    });
    const rawTools = (Array.isArray(result.tools) ? result.tools : Array.isArray(result) ? result : []).slice(0, 250);
    const tools = rawTools.map((tool): Omit<McpDiscoveredToolRecord, "id" | "created_at" | "updated_at"> => {
      const record = tool as JsonRecord;
      const name = String(record.name ?? record.id ?? "").trim().slice(0, 160);
      const description = String(record.description ?? "").slice(0, 2000);
      const rawSchema = (record.inputSchema ?? record.input_schema ?? {}) as JsonRecord;
      const inputSchema = JSON.stringify(rawSchema).length <= 100_000 ? rawSchema : {};
      const hints = normalizeCapabilityHints(record.capabilities ?? record.capabilityHints, `${name} ${description} ${row.capability_tags.join(" ")}`);
      const riskiest = hints.map((hint) => getCapabilityDefinition(hint)?.riskLevel).includes("high")
        ? "high"
        : hints.map((hint) => getCapabilityDefinition(hint)?.riskLevel).includes("medium")
          ? "medium"
          : row.risk_profile;
      return {
        connection_id: row.id,
        user_id: row.user_id,
        workspace_id: row.workspace_id,
        name,
        label: String(record.title ?? record.label ?? name),
        description,
        input_schema: inputSchema,
        capability_hints: hints,
        risk_level: riskiest,
        approval_required: row.approval_required || riskiest === "high",
        metadata: { source: "mcp_discovery", untrustedDescription: true },
      };
    }).filter((tool) => tool.name);

    if (tools.length > 0) {
      await admin.from("mcp_discovered_tools").upsert(tools, { onConflict: "connection_id,name" });
    }
    await admin.from("mcp_connections").update({
      status: "active",
      last_discovered_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", row.id);

    await logRuntimeAuditEvent({
      userId: input.userId,
      workspaceId: row.workspace_id,
      eventType: "mcp.tools.discovered",
      riskLevel: row.risk_profile,
      summary: `Discovered ${tools.length} MCP tool(s) for ${row.label}.`,
      metadata: { connectionId: row.id, tools: tools.map((tool) => tool.name) },
    }).catch(() => undefined);

    return tools;
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP discovery failed.";
    await admin.from("mcp_connections").update({ status: "error", last_error: message }).eq("id", row.id);
    throw new Error(message);
  }
}

function scoreTool(capability: DoblyCapability, tool: McpDiscoveredToolRecord, connection: McpConnectionRecord, prompt: string) {
  let score = 0;
  if (tool.capability_hints.includes(capability)) score += 80;
  if (connection.capability_tags.includes(capability)) score += 20;
  const lower = prompt.toLowerCase();
  if (lower.includes(tool.name.toLowerCase()) || lower.includes(tool.label.toLowerCase())) score += 10;
  if (tool.risk_level === "low") score += 4;
  if (tool.approval_required) score -= 2;
  return score;
}

export async function resolveUniversalExecutionPaths(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  requiredCapabilities?: DoblyCapability[];
}) {
  const capabilities: DoblyCapability[] = input.requiredCapabilities?.length
    ? input.requiredCapabilities
    : inferCapabilitiesFromText(input.prompt)
        .map(asDoblyCapability)
        .filter((capability): capability is DoblyCapability => Boolean(capability));
  const admin = createAdminSupabaseClient();
  let connectionQuery = admin.from("mcp_connections").select("*").eq("user_id", input.userId).eq("status", "active");
  if (input.workspaceId) connectionQuery = connectionQuery.or(`workspace_id.eq.${input.workspaceId},workspace_id.is.null`);
  const { data: connectionRows, error: connectionError } = await connectionQuery;
  if (connectionError) throw new Error(connectionError.message);

  const connections = (connectionRows ?? []) as McpConnectionRecord[];
  const toolsResult = connections.length
    ? await admin.from("mcp_discovered_tools").select("*").in("connection_id", connections.map((item) => item.id))
    : { data: [] };
  const tools = (toolsResult.data ?? []) as McpDiscoveredToolRecord[];
  const connectionById = new Map(connections.map((connection) => [connection.id, connection]));

  const paths: UniversalExecutionPath[] = [];
  for (const capability of capabilities) {
    const candidates = tools
      .map((tool) => ({ tool, connection: connectionById.get(tool.connection_id)! }))
      .filter((item) => item.connection)
      .map((item) => ({
        item,
        score: scoreTool(capability, item.tool, item.connection, input.prompt),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates[0]) {
      const best = candidates[0].item;
      paths.push({
        kind: "mcp",
        capability,
        label: `${best.connection.label}: ${best.tool.label}`,
        score: candidates[0].score,
        riskLevel: best.tool.risk_level,
        approvalRequired: best.tool.approval_required,
        connection: redactMcpConnection(best.connection) as McpConnectionRecord,
        tool: best.tool,
        reason: `Connected MCP tool matches ${capability}.`,
      });
    } else {
      const definition = getCapabilityDefinition(capability);
      paths.push({
        kind: "fallback",
        capability,
        label: definition?.label ?? capability,
        score: 5,
        riskLevel: definition?.riskLevel ?? "medium",
        approvalRequired: (definition?.riskLevel ?? "medium") === "high",
        reason: "No connected MCP tool found; Dobly should use native/internal/browser/fallback execution.",
      });
    }
  }
  return { capabilities, paths };
}
