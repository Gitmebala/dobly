import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type AuditAction =
  | "connection_created"
  | "connection_activated"
  | "connection_deactivated"
  | "credential_accessed"
  | "credential_rotated"
  | "connection_deleted"
  | "connection_test";

export interface AuditLogEntry {
  id: string;
  userId: string;
  connectionId: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  status: "success" | "failure";
  errorMessage?: string;
  createdAt: string;
}

/**
 * Log a connection-related audit event
 */
export async function logConnectionAudit(params: {
  userId: string;
  connectionId: string;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  status: "success" | "failure";
  errorMessage?: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from("connection_audit_logs").insert({
    user_id: params.userId,
    connection_id: params.connectionId,
    action: params.action,
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
    metadata: params.metadata || null,
    status: params.status,
    error_message: params.errorMessage || null,
  });

  if (error) {
    console.error("Failed to log connection audit:", error);
    // Don't throw - audit logging shouldn't break the operation
  }
}

/**
 * Get audit logs for a connection (only for authorized users)
 */
export async function getConnectionAuditLogs(
  userId: string,
  connectionId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const admin = createAdminSupabaseClient();

  // Verify user owns this connection
  const { data: connection, error: connError } = await admin
    .from("connections")
    .select("id")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .single();

  if (connError || !connection) {
    throw new Error("Connection not found or access denied.");
  }

  const { data, error } = await admin
    .from("connection_audit_logs")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Failed to fetch audit logs.");
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    connectionId: row.connection_id,
    action: row.action,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
}

/**
 * Get credential access summary (for security dashboard)
 */
export async function getCredentialAccessSummary(
  userId: string,
  connectionId: string,
  days: number = 7
): Promise<{
  totalAccess: number;
  successfulAccess: number;
  failedAccess: number;
  lastAccessedAt: string | null;
  uniqueIPs: string[];
}> {
  const admin = createAdminSupabaseClient();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await admin
    .from("connection_audit_logs")
    .select("*")
    .eq("connection_id", connectionId)
    .eq("action", "credential_accessed")
    .gte("created_at", since.toISOString());

  if (error || !data) {
    return {
      totalAccess: 0,
      successfulAccess: 0,
      failedAccess: 0,
      lastAccessedAt: null,
      uniqueIPs: [],
    };
  }

  const uniqueIPs: string[] = Array.from(
    new Set(
      data
        .map((log: any) => log.ip_address)
        .filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
    )
  );
  const successful = data.filter((log: any) => log.status === "success").length;
  const failed = data.filter((log: any) => log.status === "failure").length;
  const lastAccess = data.length > 0 ? data[0].created_at : null;

  return {
    totalAccess: data.length,
    successfulAccess: successful,
    failedAccess: failed,
    lastAccessedAt: lastAccess,
    uniqueIPs,
  };
}
