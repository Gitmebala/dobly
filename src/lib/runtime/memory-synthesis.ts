import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  completeDurableRuntimeRun,
  createDurableArtifact,
  createDurableRuntimeRun,
} from "@/lib/runtime/durable-runtime";
import { BUSINESS_MEMORY_SCOPES, normalizeMemoryTags, type BusinessMemoryScope } from "@/lib/business-memory";
import { inferDoblyExecutionIntent } from "@/lib/dobly-inference";

export interface MemorySynthesisInput {
  userId: string;
  workspaceId?: string | null;
  scope?: BusinessMemoryScope | "all";
  limit?: number;
  writeBack?: boolean;
}

function synthesizeMemory(items: Array<Record<string, unknown>>) {
  const titles = items.map((item) => String(item.title ?? "")).filter(Boolean);
  const tags = normalizeMemoryTags(items.flatMap((item) => (Array.isArray(item.tags) ? item.tags : [])));
  const byKind = items.reduce<Record<string, number>>((acc, item) => {
    const kind = String(item.kind ?? "unknown");
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});

  return {
    title: "Dobly memory synthesis",
    summary:
      items.length === 0
        ? "No memory items were available to synthesize yet."
        : `Synthesized ${items.length} memory items across ${Object.keys(byKind).length} knowledge type(s).`,
    themes: tags.slice(0, 12),
    coverage: byKind,
    notableItems: titles.slice(0, 12),
    gaps: [
      "Add explicit escalation rules for high-risk actions.",
      "Add approved brand/customer language examples.",
      "Add pricing, refund, and fulfillment policies where missing.",
    ],
  };
}

export async function runMemorySynthesis(input: MemorySynthesisInput) {
  const intent = inferDoblyExecutionIntent({
    prompt: `Synthesize memory for ${input.scope ?? "all"} scope`,
    context: { scope: input.scope ?? "all", writeBack: Boolean(input.writeBack) },
    explicit: {
      departmentId: "leadership",
      workTypeId: "decide",
      outputTypeId: "brief",
      trustLevelId: "informational",
      memoryScopeId: "workspace",
    },
    availability: { runtimes: { memory_synthesis: true } },
  });
  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: "memory_synthesis_runtime",
    toolLabel: "Memory Synthesis Runtime",
    toolFamily: "memory",
    task: `Synthesize Dobly memory for ${input.scope ?? "all"} scope.`,
    riskLevel: "low",
    context: { scope: input.scope ?? "all", writeBack: Boolean(input.writeBack) },
    intent,
  });

  try {
    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from("business_memory_items")
      .select("*")
      .eq("user_id", input.userId)
      .order("updated_at", { ascending: false })
      .limit(Math.max(1, Math.min(200, Number(input.limit ?? 80))));

    if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
    if (input.scope && input.scope !== "all" && BUSINESS_MEMORY_SCOPES.includes(input.scope)) {
      query = query.eq("scope", input.scope);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const synthesis = synthesizeMemory((data ?? []) as Array<Record<string, unknown>>);

    if (input.writeBack) {
      await supabase.from("business_memory_items").insert({
        user_id: input.userId,
        workspace_id: input.workspaceId ?? null,
        kind: "decision",
        scope: input.scope && input.scope !== "all" ? input.scope : "global",
        title: synthesis.title,
        body: synthesis.summary,
        tags: synthesis.themes,
        source: "memory_synthesis",
        confidence: 0.8,
        metadata: synthesis,
      });
    }

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "json",
      title: "Memory synthesis",
      content: synthesis,
      metadata: { scope: input.scope ?? "all", writeBack: Boolean(input.writeBack) },
      intent,
    });

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: synthesis.summary,
      result: synthesis,
    });

    return { run: completed, artifacts: [artifact], result: synthesis };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Memory synthesis failed.";
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "failed",
      summary: message,
      errorMessage: message,
    });
    return { run: failed, artifacts: [], error: message };
  }
}
