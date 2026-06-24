import { z } from "zod";

export const podCapabilityKindSchema = z.enum([
  "reasoning",
  "workflow",
  "conversation",
  "tool",
  "document",
  "approval",
  "memory",
  "reporting",
  "notification",
  "handoff",
]);

export const podRiskLevelSchema = z.enum(["low", "medium", "high"]);
export const podModeSchema = z.enum(["draft", "supervised", "active", "paused", "archived"]);
export const podAudienceSchema = z.enum(["personal", "business", "both"]);

export const podCapabilitySchema = z.object({
  id: z.string(),
  kind: podCapabilityKindSchema,
  title: z.string(),
  purpose: z.string(),
  required: z.boolean(),
  riskLevel: podRiskLevelSchema,
  requiredTools: z.array(z.string()),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  runtime: z.enum(["instant", "event", "scheduled", "conversation", "file", "manual"]),
});

export const podRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  rule: z.string(),
  enforcement: z.enum(["always", "approval", "suggestion"]),
  riskLevel: podRiskLevelSchema,
});

export const podApprovalPolicySchema = z.object({
  defaultMode: z.enum(["ask_first", "supervised", "allow_low_risk"]),
  alwaysAskFor: z.array(z.string()),
  canDoWithoutAsking: z.array(z.string()),
  neverDo: z.array(z.string()),
});

export const podSimulationScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  input: z.string(),
  expectedBehavior: z.string(),
  needsApproval: z.boolean(),
  riskLevel: podRiskLevelSchema,
});

export const podVerticalBaselineSchema = z.object({
  id: z.string(),
  title: z.string(),
  departmentId: z.string(),
  competitorBaseline: z.array(z.string()),
  mustMatch: z.array(z.string()),
  doblyAdvantage: z.array(z.string()),
  workerDepth: z.array(z.string()),
});

export const podSpecSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  label: z.string(),
  sourcePrompt: z.string(),
  audience: podAudienceSchema,
  purpose: z.string(),
  job: z.object({
    summary: z.string(),
    duties: z.array(z.string()),
    outcomes: z.array(z.string()),
    notResponsibleFor: z.array(z.string()),
  }),
  mode: podModeSchema,
  capabilities: z.array(podCapabilitySchema),
  channels: z.array(z.string()),
  tools: z.array(z.string()),
  memory: z.object({
    enabled: z.boolean(),
    scopes: z.array(z.string()),
    firstFactsToLearn: z.array(z.string()),
  }),
  approvalPolicy: podApprovalPolicySchema,
  rules: z.array(podRuleSchema),
  reporting: z.object({
    cadence: z.enum(["none", "on_activity", "daily", "weekly"]),
    style: z.enum(["brief", "standard", "detailed"]),
    metrics: z.array(z.string()),
  }),
  verticalBaseline: podVerticalBaselineSchema.optional(),
  launch: z.object({
    readinessScore: z.number().min(0).max(100),
    missingConnections: z.array(z.string()),
    nextSteps: z.array(z.string()),
    safestFirstMode: z.enum(["draft", "supervised", "active"]),
  }),
  simulations: z.array(podSimulationScenarioSchema),
});

export type PodCapabilityKind = z.infer<typeof podCapabilityKindSchema>;
export type PodRiskLevel = z.infer<typeof podRiskLevelSchema>;
export type PodMode = z.infer<typeof podModeSchema>;
export type PodAudience = z.infer<typeof podAudienceSchema>;
export type PodCapability = z.infer<typeof podCapabilitySchema>;
export type PodRule = z.infer<typeof podRuleSchema>;
export type PodApprovalPolicy = z.infer<typeof podApprovalPolicySchema>;
export type PodSimulationScenario = z.infer<typeof podSimulationScenarioSchema>;
export type PodVerticalBaseline = z.infer<typeof podVerticalBaselineSchema>;
export type PodSpec = z.infer<typeof podSpecSchema>;

export interface PodBuildContext {
  userId: string;
  prompt: string;
  businessProfile?: {
    business_name?: string | null;
    business_type?: string | null;
    description?: string | null;
    brand_voice?: string | null;
    context_summary?: string | null;
  } | null;
  connections?: Array<{
    provider: string;
    status?: string | null;
    label?: string | null;
  }>;
}

export interface PodRecord {
  id: string;
  user_id: string;
  name: string;
  label: string;
  purpose: string;
  source_prompt: string;
  audience: PodAudience;
  mode: PodMode;
  spec: PodSpec;
  readiness_score: number;
  status: PodMode;
  created_at: string;
  updated_at: string;
}
