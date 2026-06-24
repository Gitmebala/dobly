import "server-only";
import { inferDoblyExecutionIntent } from "@/lib/dobly-inference";
import {
  completeDurableRuntimeRun,
  createDurableArtifact,
  createDurableRuntimeRun,
} from "@/lib/runtime/durable-runtime";
import { requireRuntimeProvider } from "@/lib/runtime/provider-health";
import { estimateCapabilityCost } from "@/lib/billing/cost-catalog";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import { assertSafeOutboundUrl, safeOutboundFetch } from "@/lib/security/safe-fetch";

type JsonRecord = Record<string, unknown>;

export interface ResearchRuntimeInput {
  userId: string;
  workspaceId?: string | null;
  query: string;
  mode?: "answer" | "sources" | "crawl" | "deep";
  urls?: string[];
  context?: JsonRecord;
}

async function fetchJson(url: string) {
  const { response, text } = await safeOutboundFetch(url, { headers: { accept: "application/json", "user-agent": "Dobly Research/1.0" } }, { timeoutMs: 10_000, maxResponseBytes: 2 * 1024 * 1024 });
  if (!response.ok) return null;
  try { return JSON.parse(text) as JsonRecord; } catch { return null; }
}

async function runDirectSourceResearch(query: string) {
  const encoded = encodeURIComponent(query);
  const [wikipedia, openAlex, crossref] = await Promise.all([
    fetchJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&utf8=1&format=json&origin=*&srlimit=5`),
    fetchJson(`https://api.openalex.org/works?search=${encoded}&per-page=5&select=id,display_name,publication_year,doi,primary_location`),
    fetchJson(`https://api.crossref.org/works?query=${encoded}&rows=5&select=DOI,title,published,URL,publisher`),
  ]);
  const wikiResults = Array.isArray((wikipedia?.query as JsonRecord | undefined)?.search)
    ? ((wikipedia?.query as JsonRecord).search as JsonRecord[]).map((item) => ({
        title: String(item.title ?? ""),
        snippet: item.wordcount ? `${item.wordcount} words in this article.` : "Wikipedia reference article.",
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(item.title ?? "").replaceAll(" ", "_"))}`,
        source: "Wikipedia",
      }))
    : [];
  const openAlexResults = Array.isArray(openAlex?.results)
    ? (openAlex.results as JsonRecord[]).map((item) => ({
        title: String(item.display_name ?? ""),
        snippet: item.publication_year ? `Published ${item.publication_year}.` : "",
        url: String(item.doi ?? item.id ?? ""),
        source: "OpenAlex",
      }))
    : [];
  const crossrefItems = ((crossref?.message as JsonRecord | undefined)?.items ?? []) as unknown;
  const crossrefResults = Array.isArray(crossrefItems)
    ? (crossrefItems as JsonRecord[]).map((item) => ({
        title: Array.isArray(item.title) ? String(item.title[0] ?? "") : String(item.title ?? ""),
        snippet: item.publisher ? `Published by ${item.publisher}.` : "",
        url: String(item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : "")),
        source: "Crossref",
      }))
    : [];
  const sources = [...wikiResults, ...openAlexResults, ...crossrefResults].filter((item) => item.title && item.url);
  const answer = sources.length
    ? `Dobly found ${sources.length} direct sources. Key starting points:\n${sources.slice(0, 8).map((item, index) => `${index + 1}. ${item.title} (${item.source})`).join("\n")}`
    : "Dobly did not find enough reliable direct sources for this request. Use deep research when broader web coverage is required.";
  return { answer, citations: sources.map((source) => source.url), sources, raw: { wikipedia, openAlex, crossref } };
}

async function runPerplexityQuery(query: string, context: JsonRecord) {
  requireRuntimeProvider("perplexity");
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || "sonar-pro",
      messages: [
        {
          role: "system",
          content:
            "You are Dobly's research runtime. Return concise, cited, decision-ready research with source URLs when available.",
        },
        {
          role: "user",
          content: JSON.stringify({ query, context }, null, 2),
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const data = (await response.json().catch(() => null)) as JsonRecord | null;
  if (!response.ok) {
    throw new Error(String((data?.error as JsonRecord | undefined)?.message ?? `Perplexity failed with ${response.status}`));
  }

  const choices = Array.isArray(data?.choices) ? data.choices : [];
  const first = choices[0] as JsonRecord | undefined;
  const message = first?.message as JsonRecord | undefined;
  return {
    answer: String(message?.content ?? ""),
    citations: Array.isArray(data?.citations) ? data.citations : [],
    raw: data ?? {},
  };
}

async function scrapeWithFirecrawl(url: string) {
  requireRuntimeProvider("firecrawl");
  await assertSafeOutboundUrl(url);
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links"],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const data = (await response.json().catch(() => null)) as JsonRecord | null;
  if (!response.ok) {
    throw new Error(String((data?.error as JsonRecord | undefined)?.message ?? `Firecrawl failed with ${response.status}`));
  }

  return data ?? {};
}

export async function runResearchRuntime(input: ResearchRuntimeInput) {
  const intent = inferDoblyExecutionIntent({
    prompt: input.query,
    context: input.context ?? {},
    explicit: {
      workTypeId: "research",
      outputTypeId: "brief",
      trustLevelId: "draft_propose",
    },
    availability: { runtimes: { research: true } },
  });
  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: input.mode === "crawl" ? "firecrawl_research" : input.mode === "deep" ? "perplexity_research" : "dobly_direct_research",
    toolLabel: input.mode === "crawl" ? "Firecrawl Research Runtime" : input.mode === "deep" ? "Perplexity Deep Research" : "Dobly Direct Research",
    toolFamily: "research",
    task: input.query,
    riskLevel: "low",
    context: input.context ?? {},
    intent,
  });

  const estimate = estimateCapabilityCost({
    capability: input.mode === "deep" ? "research.deep" : "research.standard",
    market: "KE",
    preferredProvider: input.mode === "deep" ? "perplexity" : "dobly_web",
  });
  let reservation: any = null;
  try {
    reservation = await reserveOperatingCapacity({
      userId: input.userId,
      workspaceId: input.workspaceId,
      capability: input.mode === "deep" ? "research.deep" : "research.standard",
      provider: estimate.route.provider,
      estimatedMinor: estimate.estimatedMinor,
      idempotencyKey: `research:${run.id}`,
      runId: run.id,
      coworkerId: typeof input.context?.operatorId === "string" ? input.context.operatorId : null,
      metadata: { mode: input.mode ?? "answer" },
    });
    const scraped =
      input.mode === "crawl" || input.urls?.length
        ? await Promise.all((input.urls ?? []).slice(0, 6).map((url) => scrapeWithFirecrawl(url)))
        : [];
    const research = input.mode === "deep"
      ? await runPerplexityQuery(input.query, input.context ?? {})
      : input.mode === "crawl"
        ? null
        : await runDirectSourceResearch(input.query);
    const result = {
      query: input.query,
      answer: research?.answer ?? "Firecrawl extraction completed.",
      citations: research?.citations ?? [],
      sources: "sources" in (research ?? {}) ? (research as any).sources : [],
      scraped,
    };

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "json",
      title: "Research result",
      content: result,
      metadata: { provider: input.mode === "crawl" ? "firecrawl" : estimate.route.provider },
      intent,
    });

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: result.answer.slice(0, 500) || "Research completed.",
      result,
    });

    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimate.estimatedMinor,
      status: "succeeded",
      metadata: { sourceCount: result.citations.length },
    });
    return { run: completed, artifacts: [artifact], result, billing: { reservationId: reservation.id, costMinor: estimate.estimatedMinor } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research runtime failed.";
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: message.includes("not configured") ? "not_configured" : "failed",
      summary: message,
      errorMessage: message,
    });
    if (reservation?.id) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: failedProviderCharge({ paidRail: estimate.route.paidRail, estimatedMinor: estimate.estimatedMinor, errorMessage: message }),
        status: "failed",
        metadata: { error: message },
      }).catch(() => undefined);
    }
    return { run: failed, artifacts: [], error: message };
  }
}
