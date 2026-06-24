// Cost Optimization Layer for Dobly AI
// Smart model routing, caching, and usage optimization

import { anthropic } from "./anthropic";

export type ModelTier = "budget" | "standard" | "premium";
export type ModelProvider = "anthropic" | "groq";
export type IntelligenceTier =
  | "classification"
  | "standard_reasoning"
  | "premium_reasoning"
  | "tool_operation"
  | "deterministic";

export interface ModelConfig {
  name: string;
  provider: ModelProvider;
  tier: ModelTier;
  intelligenceTier: IntelligenceTier;
  costPer1kInput: number;
  costPer1kOutput: number;
  maxTokens: number;
  useCases: string[];
}

const PREMIUM_MODEL = process.env.DOBLY_PREMIUM_MODEL || "claude-sonnet-4-20250514";
const TOOL_MODEL = process.env.DOBLY_TOOL_MODEL || PREMIUM_MODEL;
const CLASSIFIER_MODEL = process.env.DOBLY_CLASSIFIER_MODEL || "llama-3.1-8b-instant";
const STANDARD_MODEL = process.env.DOBLY_STANDARD_MODEL || "llama-3.3-70b-versatile";

const modelRegistry: Record<string, ModelConfig> = {
  [PREMIUM_MODEL]: {
    name: "Claude Sonnet 4",
    provider: "anthropic",
    tier: "premium",
    intelligenceTier: "premium_reasoning",
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 32000,
    useCases: [
      "workflow_generation",
      "complex_analysis",
      "document_orchestration",
      "business_profile",
      "system_compilation",
      "claude_mcp",
      "tool_operation",
      "software_operation",
    ],
  },
  [CLASSIFIER_MODEL]: {
    name: "Fast Classifier",
    provider: "groq",
    tier: "budget",
    intelligenceTier: "classification",
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.00008,
    maxTokens: 8192,
    useCases: ["classification", "routing", "escalation_detection", "pattern_match"],
  },
  [STANDARD_MODEL]: {
    name: "Standard Reasoning",
    provider: "groq",
    tier: "standard",
    intelligenceTier: "standard_reasoning",
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
    maxTokens: 128000,
    useCases: ["text_generation", "summarization", "routine_decisions", "drafting"],
  },
};

if (TOOL_MODEL !== PREMIUM_MODEL) {
  modelRegistry[TOOL_MODEL] = {
    name: "Claude MCP Tool Operator",
    provider: "anthropic",
    tier: "premium",
    intelligenceTier: "tool_operation",
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 32000,
    useCases: ["claude_mcp", "tool_operation", "software_operation"],
  };
}

export const MODEL_REGISTRY = modelRegistry;

interface CacheEntry {
  response: string;
  createdAt: number;
  hitCount: number;
}

class PromptCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxAge = 1000 * 60 * 15;
  private maxSize = 500;

  private hash(prompt: string, model: string): string {
    let hash = 0;
    const str = `${model}:${prompt.slice(0, 200)}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  get(prompt: string, model: string): string | null {
    const key = this.hash(prompt, model);
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.response;
  }

  set(prompt: string, model: string, response: string): void {
    if (this.cache.size >= this.maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, entry] of this.cache) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestKey = key;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const key = this.hash(prompt, model);
    this.cache.set(key, { response, createdAt: Date.now(), hitCount: 0 });
  }

  getStats(): { size: number; hits: number } {
    let hits = 0;
    for (const entry of this.cache.values()) {
      hits += entry.hitCount;
    }
    return { size: this.cache.size, hits };
  }
}

interface CostTracker {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cached: boolean;
  timestamp: number;
}

class CostTrackerService {
  private usage: CostTracker[] = [];
  private budgetLimits: Map<string, number> = new Map();

  record(usage: Omit<CostTracker, "timestamp">): void {
    this.usage.push({ ...usage, timestamp: Date.now() });

    if (this.usage.length > 10000) {
      this.usage = this.usage.slice(-5000);
    }
  }

  getDailyCost(): number {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.usage
      .filter(u => u.timestamp > dayAgo)
      .reduce((sum, u) => sum + u.costUsd, 0);
  }

  getByModel(): Record<string, { calls: number; cost: number }> {
    const result: Record<string, { calls: number; cost: number }> = {};
    for (const u of this.usage) {
      if (!result[u.model]) result[u.model] = { calls: 0, cost: 0 };
      result[u.model].calls++;
      result[u.model].cost += u.costUsd;
    }
    return result;
  }

  setBudget(model: string, limitUsd: number): void {
    this.budgetLimits.set(model, limitUsd);
  }

  checkBudget(model: string): { exceeded: boolean; current: number; limit: number } {
    const limit = this.budgetLimits.get(model);
    if (!limit) return { exceeded: false, current: 0, limit: 0 };

    const current = this.usage
      .filter(u => u.model === model)
      .reduce((sum, u) => sum + u.costUsd, 0);

    return { exceeded: current > limit, current, limit };
  }

  getOptimizations(): string[] {
    const suggestions: string[] = [];
    const byModel = this.getByModel();

    for (const [model, stats] of Object.entries(byModel)) {
      const config = MODEL_REGISTRY[model];
      if (!config) continue;

      if (config.tier === "premium" && stats.calls > 10) {
        suggestions.push(`Consider using ${config.name} only for complex tasks. ${stats.calls} calls this period.`);
      }
    }

    const totalCost = Object.values(byModel).reduce((sum, s) => sum + s.cost, 0);
    if (totalCost > 10) {
      suggestions.push("Total spend is high. Review model routing for potential savings.");
    }

    return suggestions;
  }
}

export const costTracker = new CostTrackerService();
export const promptCache = new PromptCache();

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const config = MODEL_REGISTRY[model];
  if (!config) return 0;
  return (inputTokens / 1000) * config.costPer1kInput + (outputTokens / 1000) * config.costPer1kOutput;
}

export async function smartModelRoute(prompt: string, taskType: string): Promise<string> {
  const promptLength = prompt.length;
  const complexity = promptLength > 2000 ? "high" : promptLength > 500 ? "medium" : "low";

  if (
    taskType === "workflow_generation" ||
    taskType === "business_profile" ||
    taskType === "complex_analysis" ||
    taskType === "system_compilation"
  ) {
    return PREMIUM_MODEL;
  }

  if (taskType === "claude_mcp" || taskType === "tool_operation") {
    return TOOL_MODEL;
  }

  if (taskType === "routing" || taskType === "classification" || taskType === "escalation_detection") {
    return CLASSIFIER_MODEL;
  }

  if (taskType === "skill_task" || taskType === "quick_summaries") {
    if (complexity === "low") {
      return CLASSIFIER_MODEL;
    }
    return STANDARD_MODEL;
  }

  if (taskType === "simple_text" || taskType === "routine_decision" || taskType === "drafting") {
    return STANDARD_MODEL;
  }

  return complexity === "high" ? PREMIUM_MODEL : STANDARD_MODEL;
}

export interface OptimizedCallOptions {
  model?: string;
  taskType?: string;
  cacheable?: boolean;
  fallback?: boolean;
  maxRetries?: number;
  systemPrompt?: string;
}

async function callGroqChat(input: {
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens: number;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: Math.min(input.maxTokens, 4096),
      messages: [
        ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
        { role: "user", content: input.prompt },
      ],
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq request failed with status ${response.status}.`);
  }

  return {
    content: data?.choices?.[0]?.message?.content ?? "",
    inputTokens: data?.usage?.prompt_tokens,
    outputTokens: data?.usage?.completion_tokens,
  };
}

export async function optimizedAICompletion(
  prompt: string,
  options: OptimizedCallOptions = {}
): Promise<{ content: string; model: string; cached: boolean; cost: number }> {
  const { model: forcedModel, taskType = "general_purpose", cacheable = true, fallback = true, systemPrompt } = options;

  const model = forcedModel || await smartModelRoute(prompt, taskType);

  const cacheKey = systemPrompt ? `${systemPrompt.slice(0, 50)}:${prompt}` : prompt;

  if (cacheable) {
    const cached = promptCache.get(cacheKey, model);
    if (cached) {
      costTracker.record({ model, inputTokens: 0, outputTokens: 0, costUsd: 0, cached: true });
      return { content: cached, model, cached: true, cost: 0 };
    }
  }

  const inputTokens = estimateTokens(prompt) + estimateTokens(systemPrompt || "");
  const maxTokens = MODEL_REGISTRY[model]?.maxTokens || 4096;

  const modelConfig = MODEL_REGISTRY[model];

  try {
    const result = modelConfig?.provider === "groq"
      ? await callGroqChat({ model, prompt, systemPrompt, maxTokens })
      : await anthropic.messages
          .create({
            model,
            max_tokens: maxTokens,
            ...(systemPrompt ? { system: systemPrompt } : {}),
            messages: [{ role: "user", content: prompt }],
          })
          .then((message) => {
            const content = message.content[0]?.type === "text" ? message.content[0].text : "";
            return {
              content,
              inputTokens: message.usage.input_tokens,
              outputTokens: message.usage.output_tokens,
            };
          });

    const content = result.content;
    const inputUsed = result.inputTokens || inputTokens;
    const outputUsed = result.outputTokens || estimateTokens(content);
    const cost = calculateCost(model, inputUsed, outputUsed);

    costTracker.record({ model, inputTokens: inputUsed, outputTokens: outputUsed, costUsd: cost, cached: false });

    if (cacheable && content) {
      promptCache.set(prompt, model, content);
    }

    return { content, model, cached: false, cost };
  } catch (error) {
    if (fallback && model !== PREMIUM_MODEL) {
      return optimizedAICompletion(prompt, { ...options, model: PREMIUM_MODEL, fallback: false });
    }
    throw error;
  }
}

export interface BatchOptimization {
  totalCost: number;
  potentialSavings: number;
  recommendations: string[];
  cacheHitRate: number;
  modelBreakdown: Record<string, { calls: number; cost: number; avgTokens: number }>;
}

export function analyzeCosts(): BatchOptimization {
  const byModel = costTracker.getByModel();
  const cacheStats = promptCache.getStats();
  const optimizations = costTracker.getOptimizations();

  let totalCost = 0;
  const modelBreakdown: Record<string, { calls: number; cost: number; avgTokens: number }> = {};

  for (const [model, stats] of Object.entries(byModel)) {
    totalCost += stats.cost;
    modelBreakdown[model] = { ...stats, avgTokens: 0 };
  }

  const potentialSavings = totalCost * 0.3;

  return {
    totalCost,
    potentialSavings,
    recommendations: optimizations,
    cacheHitRate: cacheStats.hits / (cacheStats.size + cacheStats.hits + 1),
    modelBreakdown,
  };
}

export function getModelRecommendations(taskComplexity: "low" | "medium" | "high", taskType: string): string[] {
  const recommendations: string[] = [];

  if (taskComplexity === "low") {
    recommendations.push(
      `Use the fast classifier tier for this task when possible.`,
      `Task type "${taskType}" works well with low-cost routing or pattern matching.`
    );
  } else if (taskComplexity === "medium") {
    recommendations.push(
      `Use the standard reasoning tier before premium Claude unless the situation is novel or high-stakes.`,
      `Consider caching responses or converting repeated patterns into deterministic rules.`
    );
  }

  return recommendations;
}
