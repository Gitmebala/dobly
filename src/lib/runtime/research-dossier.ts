import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { runResearchRuntime } from "@/lib/runtime/research";
import { createDurableArtifact } from "@/lib/runtime/durable-runtime";

type JsonRecord = Record<string, unknown>;

function normalizeUrl(value: unknown) {
  try {
    return new URL(String(value)).toString();
  } catch {
    return null;
  }
}

function scoreSource(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  let score = 0.55;
  if (/\.(gov|edu)$/.test(host)) score += 0.25;
  if (/(nature|science|ieee|acm|who|worldbank|sec|fda|europa|un\.org)/.test(host)) score += 0.2;
  if (/(medium|reddit|quora|pinterest)/.test(host)) score -= 0.15;
  return Math.max(0.1, Math.min(1, score));
}

function buildPlan(query: string) {
  return {
    query,
    steps: [
      "Clarify the decision the user needs to make.",
      "Gather current source-backed facts.",
      "Normalize citations and score source quality.",
      "Summarize tradeoffs and recommended next action.",
      "Create an action chain Dobly can execute after approval.",
    ],
  };
}

export async function createResearchDossier(input: {
  userId: string;
  workspaceId?: string | null;
  query: string;
  urls?: string[];
  context?: JsonRecord;
}) {
  const research = await runResearchRuntime({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    query: input.query,
    mode: input.urls?.length ? "sources" : "answer",
    urls: input.urls ?? [],
    context: input.context ?? {},
  });

  const citations = ((research.result?.citations ?? []) as unknown[])
    .map(normalizeUrl)
    .filter((url): url is string => Boolean(url));
  const explicitUrls = (input.urls ?? []).map(normalizeUrl).filter((url): url is string => Boolean(url));
  const sources = Array.from(new Set([...citations, ...explicitUrls])).map((url) => ({
    url,
    host: new URL(url).hostname,
    score: scoreSource(url),
  }));
  const sourceScores = Object.fromEntries(sources.map((source) => [source.url, source.score]));
  const actionChain = [
    { type: "summarize", status: "completed" },
    { type: "draft_artifact", status: "ready" },
    { type: "approval", status: "required_before_external_action" },
  ];
  const findings = {
    answer: research.result?.answer ?? research.error ?? "",
    sourceCount: sources.length,
    confidence: sources.length >= 3 ? "medium" : "needs_more_sources",
  };

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("research_dossiers").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    run_id: research.run.id,
    query: input.query,
    plan: buildPlan(input.query),
    sources,
    findings,
    source_scores: sourceScores,
    action_chain: actionChain,
  }).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create research dossier.");

  const artifact = await createDurableArtifact({
    runId: research.run.id,
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    kind: "json",
    title: "Research dossier",
    content: data as JsonRecord,
    metadata: { query: input.query, sourceCount: sources.length },
  });

  return { dossier: data as JsonRecord, research, artifact };
}
