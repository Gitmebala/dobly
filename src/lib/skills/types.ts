import type { Workflow, WorkflowActionStep, WorkflowDefinition, WorkflowTrigger } from "@/types";

export type SkillExecutionType = "standard" | "intelligence";
export type SkillRiskLevel = "low" | "medium" | "high";

export interface DoblySkillInputSchemaField {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
}

export interface DoblySkillManifest {
  key: string;
  title: string;
  summary: string;
  executionType: SkillExecutionType;
  riskLevel: SkillRiskLevel;
  requiredConnectors: string[];
  inputSchema: DoblySkillInputSchemaField[];
  outputSchema: DoblySkillInputSchemaField[];
  approvalRequired?: boolean;
  retryable?: boolean;
}

export interface DoblySkillContext {
  workflow: Workflow;
  definition: WorkflowDefinition;
  trigger: WorkflowTrigger;
  triggerPayload: Record<string, unknown>;
  step: WorkflowActionStep;
  config: Record<string, unknown>;
  stepOutputs: Record<string, Record<string, unknown>>;
}

export interface DoblySkillResult {
  success: boolean;
  output: Record<string, unknown>;
  usage?: {
    executionType: SkillExecutionType;
    units: number;
  };
}

export interface DoblySkill {
  manifest: DoblySkillManifest;
  run: (context: DoblySkillContext) => Promise<DoblySkillResult>;
}
