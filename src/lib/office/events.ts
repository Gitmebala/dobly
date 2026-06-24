import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { inferDepartmentForEvent } from "@/lib/office/departments";
import type { OfficeEventInput, OfficeEventRecord, OfficeRiskLevel } from "@/lib/office/types";

export class OfficeSchemaMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfficeSchemaMissingError";
  }
}

export function isOfficeSchemaMissingError(error: unknown) {
  return error instanceof OfficeSchemaMissingError;
}

function isSchemaCacheMissing(message?: string | null) {
  return /schema cache|could not find the table|relation .* does not exist/i.test(message ?? "");
}

function normalizeRisk(level?: OfficeRiskLevel): OfficeRiskLevel {
  return level ?? "low";
}

function toOfficeEventRecord(row: Record<string, any>): OfficeEventRecord {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id ?? null,
    departmentId: row.department_id ?? null,
    workerId: row.worker_id ?? null,
    workerKind: row.worker_kind ?? "system",
    eventType: row.event_type,
    source: row.source,
    entityType: row.entity_type ?? null,
    entityId: row.entity_id ?? null,
    title: row.title,
    summary: row.summary ?? null,
    payload: row.payload ?? {},
    riskLevel: row.risk_level ?? "low",
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export async function recordOfficeEvent(input: OfficeEventInput): Promise<OfficeEventRecord> {
  const admin = createAdminSupabaseClient();
  const departmentId = input.departmentId ?? inferDepartmentForEvent(input.eventType);
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  const { data, error } = await admin
    .from("office_events")
    .insert({
      workspace_id: input.workspaceId ?? null,
      user_id: input.userId,
      department_id: departmentId,
      worker_id: input.workerId ?? null,
      worker_kind: input.workerKind ?? "system",
      event_type: input.eventType,
      source: input.source,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      title: input.title,
      summary: input.summary ?? null,
      payload: input.payload ?? {},
      risk_level: normalizeRisk(input.riskLevel),
      occurred_at: occurredAt,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (isSchemaCacheMissing(error?.message)) {
      throw new OfficeSchemaMissingError(
        "Homebase office tables are not installed yet. Apply supabase/dobly_operating_system_schema.sql in Supabase.",
      );
    }
    throw new Error(`Failed to record office event: ${error?.message ?? "unknown error"}`);
  }

  return toOfficeEventRecord(data);
}

export async function listOfficeEvents(params: {
  userId: string;
  workspaceId?: string | null;
  departmentId?: string | null;
  workerId?: string | null;
  limit?: number;
}) {
  const admin = createAdminSupabaseClient();
  const limit = Math.max(1, Math.min(100, params.limit ?? 50));
  let query = admin
    .from("office_events")
    .select("*")
    .eq("user_id", params.userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (params.workspaceId) {
    query = query.eq("workspace_id", params.workspaceId);
  }
  if (params.departmentId) {
    query = query.eq("department_id", params.departmentId);
  }
  if (params.workerId) {
    query = query.eq("worker_id", params.workerId);
  }

  const { data, error } = await query;
  if (error) {
    if (isSchemaCacheMissing(error.message)) {
      throw new OfficeSchemaMissingError(
        "Homebase office tables are not installed yet. Apply supabase/dobly_operating_system_schema.sql in Supabase.",
      );
    }
    throw new Error(`Failed to load office events: ${error.message}`);
  }

  return (data ?? []).map((row) => toOfficeEventRecord(row));
}
