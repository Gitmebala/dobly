import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { inferCapabilitiesFromText, getCapabilityDefinition, type DoblyCapability } from "@/lib/runtime/capabilities";
import { createDurableArtifact, createDurableRuntimeRun, completeDurableRuntimeRun } from "@/lib/runtime/durable-runtime";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { assertSafeOutboundUrl, safeOutboundFetch } from "@/lib/security/safe-fetch";
import { assertEmergencyStopInactive } from "@/lib/feature-flags";

type JsonRecord = Record<string, unknown>;

export type CustomApiAuthType = "none" | "bearer" | "api_key_header" | "api_key_query" | "basic";
export type CustomApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface CustomApiConnectionRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  label: string;
  description: string;
  base_url: string;
  status: "active" | "paused" | "error" | "archived";
  auth_type: CustomApiAuthType;
  auth_header_name: string | null;
  auth_query_name: string | null;
  auth_secret_encrypted: string | null;
  default_headers: JsonRecord;
  capability_tags: DoblyCapability[];
  risk_profile: "low" | "medium" | "high";
  approval_required: boolean;
  allow_private_network: boolean;
  metadata: JsonRecord;
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomApiActionRecord {
  id: string;
  connection_id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  label: string;
  description: string;
  method: CustomApiMethod;
  path_template: string;
  query_template: JsonRecord;
  body_template: JsonRecord;
  headers_template: JsonRecord;
  input_schema: JsonRecord;
  capability_hints: DoblyCapability[];
  risk_level: "low" | "medium" | "high";
  approval_required: boolean;
  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
}

export interface CustomApiExecutionPath {
  kind: "custom_api";
  capability: DoblyCapability;
  label: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  approvalRequired: boolean;
  connection: CustomApiConnectionRecord;
  action: CustomApiActionRecord;
  reason: string;
}

function normalizeCapabilities(values: unknown, fallbackText: string) {
  const explicit = Array.isArray(values) ? values.map(String) : [];
  const inferred = inferCapabilitiesFromText(`${explicit.join(" ")} ${fallbackText}`);
  return Array.from(new Set([...explicit, ...inferred]))
    .filter((value): value is DoblyCapability => Boolean(getCapabilityDefinition(value)))
    .slice(0, 12);
}

function secretForConnection(connection: CustomApiConnectionRecord) {
  if (!connection.auth_secret_encrypted) return null;
  try {
    return decryptSecret(connection.auth_secret_encrypted);
  } catch {
    // Existing installations may contain legacy plaintext values. They remain usable
    // while a migration re-encrypts them, but are never returned through API reads.
    return connection.auth_secret_encrypted;
  }
}

function redactConnection(connection: CustomApiConnectionRecord) {
  return {
    ...connection,
    auth_secret_encrypted: null,
    has_auth_secret: Boolean(connection.auth_secret_encrypted),
  };
}

function renderTemplate(value: unknown, input: JsonRecord): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => {
      const parts = String(key).split(".");
      let current: unknown = input;
      for (const part of parts) {
        current = typeof current === "object" && current ? (current as JsonRecord)[part] : undefined;
      }
      return current == null ? "" : String(current);
    });
  }
  if (Array.isArray(value)) return value.map((item) => renderTemplate(item, input));
  if (typeof value === "object" && value) {
    return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, item]) => [key, renderTemplate(item, input)]));
  }
  return value;
}

function redactSensitiveObject(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactSensitiveObject(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as JsonRecord).map(([key, item]) => [
      key,
      /token|secret|password|authorization|cookie|api.?key|credential/i.test(key) ? "[redacted]" : redactSensitiveObject(item, depth + 1),
    ]));
  }
  return typeof value === "string" && value.length > 4000 ? `${value.slice(0, 4000)}...` : value;
}

function appendQuery(url: URL, query: JsonRecord) {
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

function assertHeadersSafeToStore(headers: JsonRecord, allowTemplates: boolean) {
  for (const [name, rawValue] of Object.entries(headers)) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new Error(`Invalid HTTP header name: ${name}`);
    const value = String(rawValue ?? "");
    if (/\r|\n/.test(value)) throw new Error(`Invalid value for HTTP header: ${name}`);
    if (/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key)$/i.test(name) && (!allowTemplates || !value.includes("{{"))) {
      throw new Error(`Store ${name} through the encrypted authentication fields, not a plain header value.`);
    }
  }
}

function authHeadersAndQuery(connection: CustomApiConnectionRecord) {
  const headers: Record<string, string> = {};
  const query: Record<string, string> = {};
  const secret = secretForConnection(connection);
  if (!secret || connection.auth_type === "none") return { headers, query };
  if (connection.auth_type === "bearer") headers.authorization = `Bearer ${secret}`;
  if (connection.auth_type === "api_key_header" && connection.auth_header_name) headers[connection.auth_header_name] = secret;
  if (connection.auth_type === "api_key_query" && connection.auth_query_name) query[connection.auth_query_name] = secret;
  if (connection.auth_type === "basic") headers.authorization = `Basic ${Buffer.from(secret).toString("base64")}`;
  return { headers, query };
}

export async function createCustomApiConnection(input: {
  userId: string;
  workspaceId?: string | null;
  label: string;
  description?: string;
  baseUrl: string;
  authType?: CustomApiAuthType;
  authHeaderName?: string | null;
  authQueryName?: string | null;
  authSecret?: string | null;
  defaultHeaders?: JsonRecord;
  capabilityTags?: DoblyCapability[];
  riskProfile?: "low" | "medium" | "high";
  approvalRequired?: boolean;
  allowPrivateNetwork?: boolean;
  metadata?: JsonRecord;
}) {
  const url = await assertSafeOutboundUrl(input.baseUrl, { allowPrivateNetwork: input.allowPrivateNetwork });
  const admin = createAdminSupabaseClient();
  assertHeadersSafeToStore(input.defaultHeaders ?? {}, false);
  const capabilityTags = input.capabilityTags?.length
    ? input.capabilityTags
    : normalizeCapabilities([], `${input.label} ${input.description ?? ""}`);
  const { data, error } = await admin
    .from("custom_api_connections")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      label: input.label,
      description: input.description ?? "",
      base_url: url.toString(),
      auth_type: input.authType ?? "none",
      auth_header_name: input.authHeaderName ?? null,
      auth_query_name: input.authQueryName ?? null,
      auth_secret_encrypted: input.authSecret ? encryptSecret(input.authSecret) : null,
      default_headers: input.defaultHeaders ?? {},
      capability_tags: capabilityTags,
      risk_profile: input.riskProfile ?? "medium",
      approval_required: input.approvalRequired ?? true,
      allow_private_network: input.allowPrivateNetwork ?? false,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create custom API connection.");
  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    eventType: "custom_api.connection.created",
    riskLevel: input.riskProfile ?? "medium",
    summary: `Custom API connected: ${input.label}`,
    metadata: { baseUrl: url.origin, capabilityTags },
  }).catch(() => undefined);
  return redactConnection(data as CustomApiConnectionRecord);
}

export async function listCustomApiConnections(input: {
  userId: string;
  workspaceId?: string | null;
  includeActions?: boolean;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("custom_api_connections")
    .select("*")
    .eq("user_id", input.userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const connections = (data ?? []) as CustomApiConnectionRecord[];
  if (!input.includeActions) return connections.map(redactConnection);
  const ids = connections.map((connection) => connection.id);
  const actions = ids.length
    ? await admin.from("custom_api_actions").select("*").in("connection_id", ids)
    : { data: [] };
  const byConnection = new Map<string, CustomApiActionRecord[]>();
  for (const action of (actions.data ?? []) as CustomApiActionRecord[]) {
    byConnection.set(action.connection_id, [...(byConnection.get(action.connection_id) ?? []), action]);
  }
  return connections.map((connection) => ({ ...redactConnection(connection), actions: byConnection.get(connection.id) ?? [] }));
}

export async function createCustomApiAction(input: {
  userId: string;
  connectionId: string;
  name: string;
  label: string;
  description?: string;
  method?: CustomApiMethod;
  pathTemplate?: string;
  queryTemplate?: JsonRecord;
  bodyTemplate?: JsonRecord;
  headersTemplate?: JsonRecord;
  inputSchema?: JsonRecord;
  capabilityHints?: DoblyCapability[];
  riskLevel?: "low" | "medium" | "high";
  approvalRequired?: boolean;
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  assertHeadersSafeToStore(input.headersTemplate ?? {}, true);
  const { data: connection, error: connectionError } = await admin
    .from("custom_api_connections")
    .select("*")
    .eq("id", input.connectionId)
    .eq("user_id", input.userId)
    .single();
  if (connectionError || !connection) throw new Error(connectionError?.message ?? "Custom API connection not found.");
  const hints = input.capabilityHints?.length
    ? input.capabilityHints
    : normalizeCapabilities([], `${input.name} ${input.label} ${input.description ?? ""} ${(connection as CustomApiConnectionRecord).capability_tags.join(" ")}`);
  const riskLevel = input.riskLevel ?? (hints.map((hint) => getCapabilityDefinition(hint)?.riskLevel).includes("high") ? "high" : (connection as CustomApiConnectionRecord).risk_profile);
  const { data, error } = await admin
    .from("custom_api_actions")
    .insert({
      connection_id: input.connectionId,
      user_id: input.userId,
      workspace_id: (connection as CustomApiConnectionRecord).workspace_id,
      name: input.name,
      label: input.label,
      description: input.description ?? "",
      method: input.method ?? "POST",
      path_template: input.pathTemplate ?? "",
      query_template: input.queryTemplate ?? {},
      body_template: input.bodyTemplate ?? {},
      headers_template: input.headersTemplate ?? {},
      input_schema: input.inputSchema ?? {},
      capability_hints: hints,
      risk_level: riskLevel,
      approval_required: input.approvalRequired ?? ((connection as CustomApiConnectionRecord).approval_required || riskLevel === "high"),
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create custom API action.");
  return data as CustomApiActionRecord;
}

export async function resolveCustomApiExecutionPaths(input: {
  userId: string;
  workspaceId?: string | null;
  prompt: string;
  requiredCapabilities?: DoblyCapability[];
}) {
  const capabilities = input.requiredCapabilities?.length ? input.requiredCapabilities : inferCapabilitiesFromText(input.prompt);
  const admin = createAdminSupabaseClient();
  let connectionQuery = admin.from("custom_api_connections").select("*").eq("user_id", input.userId).eq("status", "active");
  if (input.workspaceId) connectionQuery = connectionQuery.or(`workspace_id.eq.${input.workspaceId},workspace_id.is.null`);
  const { data: connectionRows, error } = await connectionQuery;
  if (error) throw new Error(error.message);
  const connections = (connectionRows ?? []) as CustomApiConnectionRecord[];
  const actionsResult = connections.length
    ? await admin.from("custom_api_actions").select("*").in("connection_id", connections.map((connection) => connection.id))
    : { data: [] };
  const actions = (actionsResult.data ?? []) as CustomApiActionRecord[];
  const connectionById = new Map(connections.map((connection) => [connection.id, connection]));
  const paths: CustomApiExecutionPath[] = [];
  for (const capability of capabilities) {
    const candidates = actions
      .map((action) => ({ action, connection: connectionById.get(action.connection_id)! }))
      .filter((item) => item.connection)
      .map((item) => {
        let score = 0;
        if (item.action.capability_hints.includes(capability as DoblyCapability)) score += 82;
        if (item.connection.capability_tags.includes(capability as DoblyCapability)) score += 18;
        const lower = input.prompt.toLowerCase();
        if (lower.includes(item.action.name.toLowerCase()) || lower.includes(item.action.label.toLowerCase())) score += 12;
        if (item.action.risk_level === "low") score += 3;
        if (item.action.approval_required) score -= 2;
        return { item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (best) {
      paths.push({
        kind: "custom_api",
        capability: capability as DoblyCapability,
        label: `${best.item.connection.label}: ${best.item.action.label}`,
        score: best.score,
        riskLevel: best.item.action.risk_level,
        approvalRequired: best.item.action.approval_required,
        connection: redactConnection(best.item.connection) as CustomApiConnectionRecord,
        action: best.item.action,
        reason: `Custom API action matches ${capability}.`,
      });
    }
  }
  return { capabilities, paths };
}

export async function executeCustomApiAction(input: {
  userId: string;
  actionId: string;
  workspaceId?: string | null;
  prompt?: string;
  input?: JsonRecord;
  approved?: boolean;
}) {
  assertEmergencyStopInactive("external_actions");
  const admin = createAdminSupabaseClient();
  const { data: actionRow, error: actionError } = await admin
    .from("custom_api_actions")
    .select("*")
    .eq("id", input.actionId)
    .eq("user_id", input.userId)
    .single();
  if (actionError || !actionRow) throw new Error(actionError?.message ?? "Custom API action not found.");
  const action = actionRow as CustomApiActionRecord;
  const { data: connectionRow, error: connectionError } = await admin
    .from("custom_api_connections")
    .select("*")
    .eq("id", action.connection_id)
    .eq("user_id", input.userId)
    .single();
  if (connectionError || !connectionRow) throw new Error(connectionError?.message ?? "Custom API connection not found.");
  const connection = connectionRow as CustomApiConnectionRecord;

  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? action.workspace_id ?? connection.workspace_id ?? null,
    toolId: `custom_api:${action.id}`,
    toolLabel: `${connection.label}: ${action.label}`,
    toolFamily: "custom_api",
    task: input.prompt ?? `Execute ${action.label}`,
    riskLevel: action.risk_level,
    context: { actionId: action.id, connectionId: connection.id, input: redactSensitiveObject(input.input ?? {}) },
  });

  if (action.approval_required && !input.approved) {
    const approval = await createRuntimeApproval({
      userId: input.userId,
      workspaceId: input.workspaceId ?? action.workspace_id ?? connection.workspace_id ?? null,
      runId: run.id,
      title: `Approve custom API action: ${action.label}`,
      message: `Dobly wants to call ${connection.label}. Review before it acts.`,
      actionLabel: "Approve API call",
      riskLevel: action.risk_level,
      metadata: {
        resume: {
          type: "custom_api_action",
          actionId: action.id,
          inputEncrypted: encryptSecret(JSON.stringify(input.input ?? {})),
          prompt: input.prompt ?? "",
        },
        connection: { id: connection.id, label: connection.label },
        action: { id: action.id, label: action.label, method: action.method, pathTemplate: action.path_template },
      },
    });
    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: "Custom API action is waiting for approval.",
      result: { approvalId: approval.id, status: "needs_approval" },
    });
    return { run: completed, approval };
  }

  const meteredWorkspaceId = input.workspaceId ?? action.workspace_id ?? connection.workspace_id ?? null;
  const estimatedMinor = action.method === "GET" ? 0 : 5;
  const reservation = await reserveOperatingCapacity({
    userId: input.userId,
    workspaceId: meteredWorkspaceId,
    capability: action.method === "GET" ? "software.read" : "software.write",
    provider: "connected_customer",
    estimatedMinor,
    idempotencyKey: `custom-api:${run.id}:${action.id}`,
    runId: run.id,
    metadata: { actionId: action.id, connectionId: connection.id, method: action.method, approvedCost: Boolean(input.approved) },
  });

  try {
    const base = new URL(connection.base_url);
    const path = String(renderTemplate(action.path_template, input.input ?? {})).replace(/^\//, "");
    const url = new URL(path, base.href.endsWith("/") ? base.href : `${base.href}/`);
    appendQuery(url, renderTemplate(action.query_template, input.input ?? {}) as JsonRecord);
    const auth = authHeadersAndQuery(connection);
    appendQuery(url, auth.query);
    const headers = {
      "content-type": "application/json",
      ...Object.fromEntries(Object.entries(connection.default_headers ?? {}).map(([key, value]) => [key, String(value)])),
      ...Object.fromEntries(Object.entries(renderTemplate(action.headers_template, input.input ?? {}) as JsonRecord).map(([key, value]) => [key, String(value)])),
      ...auth.headers,
    };
    const body = ["GET", "DELETE"].includes(action.method)
      ? undefined
      : JSON.stringify(renderTemplate(action.body_template, input.input ?? {}));
    const { response, text: responseText } = await safeOutboundFetch(
      url,
      { method: action.method, headers, body },
      { allowPrivateNetwork: connection.allow_private_network, maxResponseBytes: 2 * 1024 * 1024 },
    );
    const parsed = (() => {
      try { return JSON.parse(responseText); } catch { return responseText; }
    })();
    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? action.workspace_id ?? connection.workspace_id ?? null,
      kind: "json",
      title: `Custom API response: ${action.label}`,
      content: { status: response.status, ok: response.ok, response: parsed },
      metadata: { connectionId: connection.id, actionId: action.id },
    });
    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: response.ok ? "completed" : "failed",
      summary: response.ok ? `Custom API action completed: ${action.label}` : `Custom API action failed with ${response.status}.`,
      result: { status: response.status, ok: response.ok, artifactId: artifact.id, response: parsed },
      errorMessage: response.ok ? undefined : responseText.slice(0, 1000),
    });
    await logRuntimeAuditEvent({
      userId: input.userId,
      workspaceId: input.workspaceId ?? action.workspace_id ?? connection.workspace_id ?? null,
      runId: run.id,
      eventType: "custom_api.action.executed",
      riskLevel: action.risk_level,
      summary: `${action.method} ${connection.label}/${action.path_template} returned ${response.status}.`,
      metadata: { actionId: action.id, connectionId: connection.id, status: response.status },
    }).catch(() => undefined);
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimatedMinor,
      status: response.ok ? "succeeded" : "failed",
      metadata: { actionId: action.id, connectionId: connection.id, responseStatus: response.status },
    });
    return { run: completed, artifact };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Custom API action failed.";
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "failed",
      summary: message,
      errorMessage: message,
    });
    await admin.from("custom_api_connections").update({ status: "error", last_error: message }).eq("id", connection.id);
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: 0,
      status: "failed",
      metadata: { actionId: action.id, connectionId: connection.id, error: message },
    }).catch(() => undefined);
    return { run: failed, error: message };
  }
}
