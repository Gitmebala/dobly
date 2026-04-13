import type { Workflow, WorkflowActionStep, WorkflowDefinition, WorkflowTrigger } from "@/types";

export type ConnectorLane = "native" | "browser" | "generic" | "local";

export interface ConnectorExecutionContext {
  workflow: Workflow;
  runId?: string;
  definition: WorkflowDefinition;
  trigger: WorkflowTrigger;
  triggerPayload: Record<string, unknown>;
  step: WorkflowActionStep;
  config: Record<string, unknown>;
  stepOutputs: Record<string, Record<string, unknown>>;
}

export interface ConnectorActionDescriptor {
  id: string;
  label: string;
  lane: ConnectorLane;
  executor: string;
}

export interface ConnectorDefinition {
  id: string;
  label: string;
  lane: ConnectorLane;
  provider: string;
  actions: ConnectorActionDescriptor[];
}

export interface ConnectorExecutor {
  id: string;
  execute(context: ConnectorExecutionContext): Promise<Record<string, unknown>>;
}
