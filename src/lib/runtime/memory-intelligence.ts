import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { normalizeMemoryTags } from "@/lib/business-memory";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

type JsonRecord = Record<string, unknown>;

function inferKind(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("refund") || lower.includes("policy")) return "policy";
  if (lower.includes("customer")) return "customer_note";
  if (lower.includes("price") || lower.includes("invoice")) return "finance_rule";
  if (lower.includes("tone") || lower.includes("brand")) return "tone";
  return "decision";
}

function inferScope(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("sales") || lower.includes("lead")) return "sales";
  if (lower.includes("support") || lower.includes("ticket")) return "support";
  if (lower.includes("finance") || lower.includes("invoice")) return "finance";
  if (lower.includes("marketing") || lower.includes("campaign")) return "marketing";
  return "global";
}

async function findPotentialConflicts(userId: string, workspaceId: string | null, body: string) {
  const admin = createAdminSupabaseClient();
  let query = admin.from("business_memory_items").select("*").eq("user_id", userId).limit(20);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data } = await query;
  const lower = body.toLowerCase();
  return (data ?? []).filter((item: any) => {
    const title = String(item.title ?? "").toLowerCase();
    const existingBody = String(item.body ?? "").toLowerCase();
    return title && lower.includes(title) || existingBody.slice(0, 80) && lower.includes(existingBody.slice(0, 80));
  });
}

export async function proposeMemoryUpdates(input: {
  userId: string;
  workspaceId?: string | null;
  sourceRunId?: string | null;
  text: string;
  autoApproveLowRisk?: boolean;
}) {
  const admin = createAdminSupabaseClient();
  const sentences = input.text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 30)
    .slice(0, 8);

  const proposals: JsonRecord[] = [];
  for (const sentence of sentences) {
    const conflicts = await findPotentialConflicts(input.userId, input.workspaceId ?? null, sentence);
    const title = sentence.slice(0, 90);
    const payload = {
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      source_run_id: input.sourceRunId ?? null,
      title,
      body: sentence,
      kind: inferKind(sentence),
      scope: inferScope(sentence),
      tags: normalizeMemoryTags(sentence.toLowerCase().match(/\b[a-z][a-z0-9-]{4,}\b/g) ?? []).slice(0, 8),
      confidence: conflicts.length ? 0.55 : 0.78,
      conflict_summary: conflicts.length ? `Potential conflict with ${conflicts.length} existing memory item(s).` : null,
      metadata: { conflicts: conflicts.map((item: any) => ({ id: item.id, title: item.title })) },
    };
    const { data, error } = await admin.from("memory_update_proposals").insert(payload).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create memory proposal.");
    proposals.push(data as JsonRecord);

    await createRuntimeApproval({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      runId: input.sourceRunId ?? null,
      title: `Approve memory: ${title}`,
      message: sentence,
      actionLabel: "Approve memory",
      riskLevel: conflicts.length ? "medium" : "low",
      metadata: { resume: { type: "memory_proposal", proposalId: (data as any).id } },
    }).catch(() => undefined);
  }

  await logRuntimeAuditEvent({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    runId: input.sourceRunId ?? null,
    eventType: "memory.proposals_created",
    riskLevel: "medium",
    summary: `${proposals.length} memory proposal(s) created.`,
    metadata: { count: proposals.length },
  }).catch(() => undefined);

  return proposals;
}

export async function decideMemoryProposal(input: {
  userId: string;
  proposalId: string;
  decision: "approved" | "rejected";
  note?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const { data: proposal, error } = await admin
    .from("memory_update_proposals")
    .update({ status: input.decision, decided_at: new Date().toISOString(), decision_note: input.note ?? null })
    .eq("id", input.proposalId)
    .eq("user_id", input.userId)
    .eq("status", "pending")
    .select("*")
    .single();
  if (error || !proposal) throw new Error(error?.message ?? "Memory proposal not found.");

  let memory = null;
  if (input.decision === "approved") {
    const insert = await admin.from("business_memory_items").insert({
      user_id: input.userId,
      workspace_id: (proposal as any).workspace_id,
      kind: (proposal as any).kind,
      scope: (proposal as any).scope,
      title: (proposal as any).title,
      body: (proposal as any).body,
      tags: (proposal as any).tags,
      source: "approved_memory_proposal",
      confidence: (proposal as any).confidence,
      metadata: (proposal as any).metadata ?? {},
    }).select("*").single();
    if (insert.error || !insert.data) throw new Error(insert.error?.message ?? "Failed to write approved memory.");
    memory = insert.data;
    await admin.from("memory_update_proposals").update({ created_memory_id: (memory as any).id }).eq("id", input.proposalId);
  }

  return { proposal, memory };
}

export async function searchMemoryIntelligence(input: {
  userId: string;
  workspaceId?: string | null;
  query: string;
  limit?: number;
}) {
  const admin = createAdminSupabaseClient();
  let dbQuery = admin
    .from("business_memory_items")
    .select("*")
    .eq("user_id", input.userId)
    .or(`title.ilike.%${input.query}%,body.ilike.%${input.query}%`)
    .limit(Math.max(1, Math.min(50, input.limit ?? 10)));
  if (input.workspaceId) dbQuery = dbQuery.eq("workspace_id", input.workspaceId);
  const { data, error } = await dbQuery;
  if (error) throw new Error(error.message);
  return {
    results: data ?? [],
    mode: "keyword",
    semanticReady: Boolean(process.env.DOBLY_EMBEDDING_PROVIDER),
    vectorStore: "pgvector",
  };
}
