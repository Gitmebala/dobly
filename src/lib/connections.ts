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
  const { data, error } = await admin
    .from("connections")
    .insert({
      user_id: params.userId,
      provider: params.provider,
      label: params.label,
      status: params.status ?? "pending",
      account_identifier: params.accountIdentifier ?? null,
      scopes: params.scopes ?? [],
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

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
