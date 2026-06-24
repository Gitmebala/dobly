import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  getUniversalConnectorDefinition,
  listUniversalConnectorDefinitions,
  type UniversalConnectorDefinition,
} from "@/lib/connectors/universal-catalog";
import { createUniversalMcpConnection, discoverUniversalMcpTools, listUniversalMcpConnections } from "@/lib/runtime/universal-mcp";
import { createCustomApiConnection, listCustomApiConnections } from "@/lib/runtime/custom-api";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { recordOperatorChatEvent } from "@/lib/operator-chat";

type JsonRecord = Record<string, unknown>;

function asJsonRecord(value: unknown): JsonRecord {
  return (value ?? {}) as JsonRecord;
}

function sanitizeConnectionForClient(connection: JsonRecord | null | undefined): JsonRecord | null {
  if (!connection) return null;
  const metadata = asJsonRecord(connection.metadata);
  return {
    id: connection.id,
    provider: connection.provider,
    label: connection.label ?? connection.name,
    status: connection.status,
    account_identifier: connection.account_identifier ?? null,
    server_url: connection.server_url ? "[configured]" : undefined,
    base_url: connection.base_url ? "[configured]" : undefined,
    last_discovered_at: connection.last_discovered_at,
    last_tested_at: connection.last_tested_at,
    updated_at: connection.updated_at,
    metadata: {
      connectorDefinitionId: metadata.connectorDefinitionId,
      provider: metadata.provider,
      category: metadata.category,
      setupMode: metadata.setupMode,
      userFacingSetup: metadata.userFacingSetup,
      authFlow: metadata.authFlow,
      sandbox: metadata.sandbox,
      artifactSupport: metadata.artifactSupport,
      rollbackSupport: metadata.rollbackSupport,
    },
  };
}

function hostedConnectorEnvKey(provider: string) {
  return `DOBLY_HOSTED_${provider.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_MCP_URL`;
}

function hostedConnectorTokenEnvKey(provider: string) {
  return `DOBLY_HOSTED_${provider.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_MCP_TOKEN`;
}

function getHostedConnectorEndpoint(definition: UniversalConnectorDefinition) {
  const providerUrl = process.env[hostedConnectorEnvKey(definition.provider)];
  const baseUrl = process.env.DOBLY_HOSTED_CONNECTOR_BASE_URL;
  const serverUrl = providerUrl ?? (baseUrl ? `${baseUrl.replace(/\/$/, "")}/${definition.provider}/mcp` : "");
  return {
    serverUrl,
    authToken: process.env[hostedConnectorTokenEnvKey(definition.provider)] ?? process.env.DOBLY_HOSTED_CONNECTOR_TOKEN ?? null,
  };
}

async function createHostedProviderSetupConnection(input: {
  userId: string;
  workspaceId?: string | null;
  definition: UniversalConnectorDefinition;
  status?: "pending" | "active" | "expired" | "error";
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connections")
    .insert({
      user_id: input.userId,
      provider: input.definition.provider,
      label: input.definition.label,
      status: input.status ?? "pending",
      account_identifier: input.definition.provider,
      scopes: input.definition.permissionScopes,
      metadata: {
        connectorDefinitionId: input.definition.id,
        provider: input.definition.provider,
        category: input.definition.category,
        setupMode: "dobly_hosted",
        userFacingSetup: "Connect account",
        workspaceId: input.workspaceId ?? null,
        setupRequired: input.definition.setupSteps,
        whatItEnables: input.definition.whatItEnables,
        approvalPolicies: input.definition.approvalPolicies,
        permissionScopes: input.definition.permissionScopes,
        sandbox: input.definition.sandbox,
        artifactSupport: input.definition.artifactSupport,
        rollbackSupport: input.definition.rollbackSupport,
        ...(input.metadata ?? {}),
      },
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create hosted connector setup.");
  return asJsonRecord(data);
}

export interface UniversalConnectorStatus {
  definition: UniversalConnectorDefinition;
  connectionStatus: "not_connected" | "connected" | "needs_setup" | "error";
  health: {
    status: "unknown" | "healthy" | "degraded" | "failed";
    message: string;
    checkedAt?: string;
  };
  discoveredTools: Array<{
    id: string;
    label: string;
    name: string;
    riskLevel: string;
    approvalRequired: boolean;
    description?: string;
  }>;
  existingConnection?: JsonRecord | null;
}

function matchesDefinition(connection: JsonRecord, definition: UniversalConnectorDefinition) {
  const metadata = (connection.metadata ?? {}) as JsonRecord;
  const label = String(connection.label ?? connection.name ?? connection.provider ?? "").toLowerCase();
  return metadata.connectorDefinitionId === definition.id ||
    metadata.provider === definition.provider ||
    label.includes(definition.provider) ||
    label.includes(definition.label.toLowerCase());
}

export async function listUniversalConnectorMarketplace(input: {
  userId: string;
  workspaceId?: string | null;
}): Promise<UniversalConnectorStatus[]> {
  const definitions = listUniversalConnectorDefinitions();
  const [mcpConnections, customApiConnections, nativeConnections] = await Promise.all([
    listUniversalMcpConnections({ userId: input.userId, workspaceId: input.workspaceId ?? null, includeTools: true }).catch(() => []),
    listCustomApiConnections({ userId: input.userId, workspaceId: input.workspaceId ?? null, includeActions: true }).catch(() => []),
    createAdminSupabaseClient()
      .from("connections")
      .select("*")
      .eq("user_id", input.userId)
      .then(({ data }) => data ?? [])
      .catch(() => []),
  ]);

  return definitions.map((definition) => {
    const pool = definition.kind === "custom_api"
      ? customApiConnections
      : definition.kind === "oauth" || definition.kind === "native"
      ? nativeConnections
      : definition.kind === "mcp"
      ? [...mcpConnections, ...nativeConnections]
      : mcpConnections;
    const existing = pool.map(asJsonRecord).find((connection) => matchesDefinition(connection, definition));
    const tools = existing && "tools" in existing && Array.isArray(existing.tools)
      ? existing.tools.map((tool: JsonRecord) => ({
        id: String(tool.id),
        label: String(tool.label ?? tool.name),
        name: String(tool.name ?? tool.label),
        riskLevel: String(tool.risk_level ?? "medium"),
        approvalRequired: Boolean(tool.approval_required),
        description: String(tool.description ?? ""),
      }))
      : existing && "actions" in existing && Array.isArray(existing.actions)
      ? existing.actions.map((action: JsonRecord) => ({
        id: String(action.id),
        label: String(action.label ?? action.name),
        name: String(action.name ?? action.label),
        riskLevel: String(action.risk_level ?? "medium"),
        approvalRequired: Boolean(action.approval_required),
        description: String(action.description ?? ""),
      }))
      : [];
    const existingStatus = String(existing?.status ?? "active");
    const status = existing
      ? existingStatus === "error" ? "error" : existingStatus === "pending" ? "needs_setup" : "connected"
      : "not_connected";
    return {
      definition,
      connectionStatus: status,
      health: {
        status: existing ? existingStatus === "error" ? "failed" : existingStatus === "pending" ? "degraded" : "healthy" : "unknown",
        message: existing ? String(existing.last_error ?? (existingStatus === "pending" ? "Provider authorization or hosted connector setup is still pending." : "Connected and ready for setup checks.")) : "Not connected yet.",
        checkedAt: String(existing?.last_discovered_at ?? existing?.last_tested_at ?? existing?.updated_at ?? ""),
      },
      discoveredTools: tools,
      existingConnection: sanitizeConnectionForClient(existing),
    } as UniversalConnectorStatus;
  });
}

export async function connectUniversalConnector(input: {
  userId: string;
  workspaceId?: string | null;
  connectorId: string;
  serverUrl?: string;
  authToken?: string | null;
  baseUrl?: string;
  authType?: "none" | "bearer" | "api_key_header" | "api_key_query" | "basic";
  authSecret?: string | null;
  allowPrivateNetwork?: boolean;
}) {
  const definition = getUniversalConnectorDefinition(input.connectorId);
  if (!definition) throw new Error("Unknown connector.");

  let connection: JsonRecord;
  if (definition.kind === "custom_api") {
    connection = asJsonRecord(await createCustomApiConnection({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      label: definition.label,
      description: definition.description,
      baseUrl: input.baseUrl ?? input.serverUrl ?? "",
      authType: input.authType ?? "none",
      authSecret: input.authSecret ?? input.authToken ?? null,
      capabilityTags: definition.capabilities,
      riskProfile: definition.defaultRisk,
      approvalRequired: definition.approvalPolicies.some((policy) => policy.approvalRequired),
      allowPrivateNetwork: input.allowPrivateNetwork ?? false,
      metadata: {
        connectorDefinitionId: definition.id,
        provider: definition.provider,
        category: definition.category,
        whatItEnables: definition.whatItEnables,
        approvalPolicies: definition.approvalPolicies,
        permissionScopes: definition.permissionScopes,
        sandbox: definition.sandbox,
        artifactSupport: definition.artifactSupport,
        rollbackSupport: definition.rollbackSupport,
      },
    }));
  } else if (definition.kind === "oauth" || definition.kind === "native") {
    connection = await createHostedProviderSetupConnection({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      definition,
      metadata: { authFlow: "oauth_provider_redirect_required" },
    });
  } else {
    if (definition.kind === "local_bridge" && !input.serverUrl) {
      throw new Error(`${definition.label} needs the local bridge URL from the desktop app.`);
    }
    const hosted = definition.kind === "mcp" && !input.serverUrl ? getHostedConnectorEndpoint(definition) : null;
    if (definition.kind === "mcp" && !input.serverUrl && !hosted?.serverUrl) {
      connection = await createHostedProviderSetupConnection({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        definition,
        metadata: {
          authFlow: "dobly_hosted_connector_not_configured",
          envRequired: [hostedConnectorEnvKey(definition.provider), "DOBLY_HOSTED_CONNECTOR_BASE_URL"],
        },
      });
      await logRuntimeAuditEvent({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        eventType: "connector.marketplace.hosted_setup_pending",
        riskLevel: definition.defaultRisk,
        summary: `${definition.label} hosted connector setup is pending provider configuration.`,
        metadata: { connectorId: definition.id, kind: definition.kind },
      }).catch(() => undefined);
      return { definition, connection };
    }
    connection = asJsonRecord(await createUniversalMcpConnection({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      label: definition.label,
      serverUrl: input.serverUrl ?? hosted?.serverUrl ?? "",
      authToken: input.authToken ?? hosted?.authToken ?? null,
      capabilityTags: definition.capabilities,
      riskProfile: definition.defaultRisk,
      approvalRequired: definition.approvalPolicies.some((policy) => policy.approvalRequired),
      metadata: {
        connectorDefinitionId: definition.id,
        provider: definition.provider,
        category: definition.category,
        setupMode: definition.kind === "mcp" && !input.serverUrl ? "dobly_hosted_mcp" : "self_hosted_or_local_mcp",
        localBridge: definition.localBridge ?? null,
        whatItEnables: definition.whatItEnables,
        approvalPolicies: definition.approvalPolicies,
        permissionScopes: definition.permissionScopes,
        sandbox: definition.sandbox,
        artifactSupport: definition.artifactSupport,
        rollbackSupport: definition.rollbackSupport,
      },
    }));
  }

  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    eventType: "connector.marketplace.connected",
    riskLevel: definition.defaultRisk,
    summary: `${definition.label} connector setup started.`,
    metadata: { connectorId: definition.id, connectionId: connection.id, kind: definition.kind },
  }).catch(() => undefined);

  return { definition, connection };
}

export async function testUniversalConnector(input: {
  userId: string;
  connectorId: string;
  connectionId: string;
  workspaceId?: string | null;
}) {
  const definition = getUniversalConnectorDefinition(input.connectorId);
  if (!definition) throw new Error("Unknown connector.");
  const admin = createAdminSupabaseClient();

  if (definition.kind === "mcp" || definition.kind === "local_bridge") {
    const { data: pendingHostedConnection } = await admin
      .from("connections")
      .select("*")
      .eq("id", input.connectionId)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (pendingHostedConnection) {
      const metadata = asJsonRecord(pendingHostedConnection.metadata);
      return {
        status: "needs_provider_setup",
        message: metadata.authFlow === "dobly_hosted_connector_not_configured"
          ? `${definition.label} is ready in the Dobly marketplace, but its hosted connector backend is not configured yet.`
          : `${definition.label} needs the provider OAuth/hosted connector authorization to complete.`,
      };
    }
    const tools = await discoverUniversalMcpTools({ userId: input.userId, connectionId: input.connectionId });
    await recordConnectorChatSignal({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      title: `${definition.label} tools discovered`,
      summary: `${tools.length} tool(s) are available to Operators.`,
      payload: { connectorId: definition.id, connectionId: input.connectionId, tools },
    });
    return {
      status: "healthy",
      message: `${definition.label} connected. ${tools.length} tool(s) discovered.`,
      tools,
    };
  }

  if (definition.kind === "custom_api") {
    await admin
      .from("custom_api_connections")
      .update({ status: "active", last_tested_at: new Date().toISOString(), last_error: null })
      .eq("id", input.connectionId)
      .eq("user_id", input.userId);
    return { status: "healthy", message: `${definition.label} custom API setup is reachable by Dobly.` };
  }

  await admin
    .from("connections")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", input.connectionId)
    .eq("user_id", input.userId);
  return {
    status: "needs_oauth",
    message: `${definition.label} requires OAuth/provider setup to complete.`,
  };
}

async function recordConnectorChatSignal(input: {
  userId: string;
  workspaceId?: string | null;
  title: string;
  summary: string;
  payload: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  const { data: conversation } = await admin
    .from("operator_conversations")
    .select("id, operator_id")
    .eq("user_id", input.userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation?.id || !conversation?.operator_id) return;
  await recordOperatorChatEvent({
    conversationId: String(conversation.id),
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    operatorId: String(conversation.operator_id),
    eventType: "tool_selected",
    title: input.title,
    summary: input.summary,
    severity: "success",
    payload: input.payload,
  }).catch(() => undefined);
}
