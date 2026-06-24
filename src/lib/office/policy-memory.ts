import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { BusinessMemoryKind, BusinessMemoryScope } from "@/lib/business-memory";
import type { OfficeDepartmentId } from "@/lib/office/types";

export interface DirectiveMemoryView {
  id: string;
  title: string;
  body: string;
  kind: BusinessMemoryKind;
  scope: BusinessMemoryScope;
  departmentId: string | null;
  tags: string[];
  updatedAt: string;
  metadata: Record<string, unknown>;
}

function isDirective(row: Record<string, any>) {
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
  return tags.includes("board-directive") || metadata.boardDirective === true;
}

function toDirectiveView(row: Record<string, any>): DirectiveMemoryView {
  return {
    id: String(row.id),
    title: String(row.title ?? "Directive"),
    body: String(row.body ?? ""),
    kind: String(row.kind ?? "decision") as BusinessMemoryKind,
    scope: String(row.scope ?? "global") as BusinessMemoryScope,
    departmentId: row.department_id ? String(row.department_id) : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {},
  };
}

export async function listDirectiveMemory(params: {
  userId: string;
  workspaceId?: string | null;
  departmentId?: OfficeDepartmentId | null;
  limit?: number;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("business_memory_items")
    .select("id,title,body,kind,scope,department_id,tags,updated_at,created_at,metadata")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(50, params.limit ?? 12)));

  if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load directive memory: ${error.message}`);

  const all = (data ?? [])
    .filter((row) => isDirective(row as Record<string, any>))
    .map((row) => toDirectiveView(row as Record<string, any>));

  if (!params.departmentId) return all;

  return all.filter((row) => {
    if (row.scope === "global" || row.scope === "boardroom" || row.scope === "general_manager") return true;
    return row.departmentId === params.departmentId || row.scope === params.departmentId;
  });
}
