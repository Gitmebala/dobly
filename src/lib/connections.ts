import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Connection, ConnectionSecret } from "@/types";

export async function upsertConnection(params: {
  userId: string;
  provider: string;
  label: string;
  status?: Connection["status"];
  accountIdentifier?: string | null;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const row = {
    user_id: params.userId,
    provider: params.provider,
    label: params.label,
    status: params.status ?? "pending",
    account_identifier: params.accountIdentifier ?? null,
    scopes: params.scopes ?? [],
    metadata: params.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  // Reconnecting the same account must update the existing row, not stack a
  // duplicate. Match on the same key as the unique index so a user who
  // re-runs an OAuth flow ends up with one connection, not one per attempt.
  const { data: existing } = await admin
    .from("connections")
    .select("id")
    .eq("user_id", params.userId)
    .eq("provider", params.provider)
    .eq("account_identifier", params.accountIdentifier ?? null)
    .maybeSingle();

  const query = existing?.id
    ? admin.from("connections").update(row).eq("id", existing.id)
    : admin.from("connections").insert(row);

  const { data, error } = await query.select("*").single();

  if (error || !data) {
    throw new Error("Failed to create connection.");
  }

  return data as Connection;
}

export async function storeConnectionSecrets(params: {
  connectionId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  secret?: string | null;
  expiresAt?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const payload = {
    connection_id: params.connectionId,
    encrypted_access_token: params.accessToken ? encryptSecret(params.accessToken) : null,
    encrypted_refresh_token: params.refreshToken ? encryptSecret(params.refreshToken) : null,
    encrypted_secret: params.secret ? encryptSecret(params.secret) : null,
    expires_at: params.expiresAt ?? null,
  };

  const { data, error } = await admin
    .from("connection_secrets")
    .upsert(payload, { onConflict: "connection_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to store connection secrets.");
  }

  return data as ConnectionSecret;
}

export async function getDecryptedConnectionSecrets(connectionId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connection_secrets")
    .select("*")
    .eq("connection_id", connectionId)
    .single();

  if (error || !data) {
    throw new Error("Connection secrets not found.");
  }

  const secretRow = data as ConnectionSecret;
  return {
    accessToken: decryptSecret(secretRow.encrypted_access_token),
    refreshToken: decryptSecret(secretRow.encrypted_refresh_token),
    secret: decryptSecret(secretRow.encrypted_secret),
    expiresAt: secretRow.expires_at,
  };
}

export async function getActiveConnectionForProvider(userId: string, provider: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`No active ${provider} connection found.`);
  }

  return data as Connection;
}

export async function getActiveConnectionForAnyProvider(userId: string, providers: string[]) {
  const admin = createAdminSupabaseClient();
  const normalized = providers.map((provider) => provider.toLowerCase());
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("Failed to load active connections.");
  }

  const match = (data ?? []).find((connection: any) =>
    normalized.some((provider) => String(connection.provider ?? "").toLowerCase().includes(provider))
  );

  if (!match) {
    throw new Error(`No active connection found for ${providers.join(", ")}.`);
  }

  return match as Connection;
}

export async function getConnectionById(connectionId: string, userId?: string) {
  const admin = createAdminSupabaseClient();
  let query = admin.from("connections").select("*").eq("id", connectionId);
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.single();
  if (error || !data) {
    throw new Error("Connection not found.");
  }

  return data as Connection;
}

export async function getConnectionExecutionAuth(params: {
  userId: string;
  providerIds: string[];
  connectionId?: string | null;
}) {
  const connection = params.connectionId
    ? await getConnectionById(params.connectionId, params.userId)
    : await getActiveConnectionForAnyProvider(params.userId, params.providerIds);
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  return { connection, secrets };
}

/**
 * Mark a connection as no longer usable so the UI can prompt a reconnect.
 *
 * Google (and most OAuth providers) revoke the refresh token itself in some
 * situations - most commonly when the OAuth consent screen is still in
 * "Testing", where refresh tokens are invalidated after 7 days. Once that
 * happens no amount of retrying will recover it, so scheduled loops must stop
 * hammering the provider and surface a reconnect prompt instead.
 */
export async function markConnectionExpired(params: { connectionId: string; reason: string }) {
  const admin = createAdminSupabaseClient();
  // connections has no last_error column, so the reason rides in metadata.
  // Read-modify-write to avoid clobbering whatever else is stored there.
  const { data: existing } = await admin
    .from("connections")
    .select("metadata")
    .eq("id", params.connectionId)
    .maybeSingle();

  const metadata = {
    ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
    expired_reason: params.reason,
    expired_at: new Date().toISOString(),
  };

  await admin
    .from("connections")
    .update({ status: "expired", metadata, updated_at: new Date().toISOString() })
    .eq("id", params.connectionId);
}
