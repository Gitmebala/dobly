import type {
  Workflow,
  WorkflowActionStep,
  WorkflowDefinition,
  WorkflowExecutionType,
  WorkflowRun,
} from "@/types";

type JsonRecord = Record<string, unknown>;

export interface CompiledExecutionStep {
  step: WorkflowActionStep;
  source: "workflow" | "runtime";
}

export interface CompiledExecutionPlan {
  steps: CompiledExecutionStep[];
  summary: {
    mode: string;
    planner: string;
    insertedRuntimeSteps: string[];
    recentRunCount: number;
  };
}

function runtimeSkillStep(input: {
  id: string;
  name: string;
  description: string;
  skillKey: string;
  executionType?: WorkflowExecutionType;
  config: Record<string, unknown>;
  saveOutputAs?: string;
  saveToMemory?: string[];
}) {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    app: "Dobly Runtime",
    actionType: "skill",
    executionType: input.executionType ?? "intelligence",
    skillKey: input.skillKey,
    enabled: true,
    lane: "generic",
    config: input.config,
    saveOutputAs: input.saveOutputAs ?? null,
    saveToMemory: input.saveToMemory ?? [],
    onFailure: "continue",
  } satisfies WorkflowActionStep;
}

function inferNeedForPlanning(definition: WorkflowDefinition) {
  if (definition.runtime?.planner !== "adaptive") return false;
  return !definition.steps.some((step) => step.executionType === "intelligence");
}

export function compileExecutionPlan(params: {
  workflow: Workflow;
  triggerPayload: JsonRecord;
  definition: WorkflowDefinition;
  memory: Record<string, JsonRecord>;
  recentRuns: WorkflowRun[];
}) {
  const { definition, workflow, triggerPayload, memory, recentRuns } = params;
  const steps: CompiledExecutionStep[] = [];
  const insertedRuntimeSteps: string[] = [];

  if (inferNeedForPlanning(definition)) {
    steps.push({
      source: "runtime",
      step: runtimeSkillStep({
        id: "runtime_plan_task",
        name: "Plan the work",
        description: "Generate a concise run plan before acting.",
        skillKey: "plan_task_breakdown",
        executionType: "intelligence",
        saveOutputAs: "runtime_plan",
        saveToMemory: ["last_decision"],
        config: {
          task_description: workflow.prompt,
          objective: definition.operator?.objective ?? workflow.description,
          trigger: triggerPayload,
          memory,
        },
      }),
    });
    insertedRuntimeSteps.push("runtime_plan_task");
  }

  definition.steps
    .filter((step) => step.enabled)
    .forEach((step) => steps.push({ step, source: "workflow" }));

  if (definition.runtime?.reportStyle) {
    steps.push({
      source: "runtime",
      step: runtimeSkillStep({
        id: "runtime_summarize_run",
        name: "Summarize the run",
        description: "Prepare the final coworker report.",
        skillKey: "synthesize_work_report",
        executionType: "intelligence",
        saveOutputAs: "runtime_report",
        saveToMemory: ["recent_summary"],
        config: {
          workflow_title: workflow.title,
          workflow_description: workflow.description,
          report_style: definition.runtime.reportStyle,
          objective: definition.operator?.objective ?? workflow.description,
        },
      }),
    });
    insertedRuntimeSteps.push("runtime_summarize_run");
  }

  return {
    steps,
    summary: {
      mode: definition.runtime?.mode ?? (definition.operator?.enabled ? "hybrid" : "automation"),
      planner: definition.runtime?.planner ?? "static",
      insertedRuntimeSteps,
      recentRunCount: recentRuns.length,
    },
  } satisfies CompiledExecutionPlan;
}
