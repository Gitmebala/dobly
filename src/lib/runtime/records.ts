import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { AgentAudience, Workflow, WorkflowActionStep, WorkflowBlueprint } from "@/types";

function inferAudience(blueprint: WorkflowBlueprint): AgentAudience {
  const corpus = `${blueprint.name} ${blueprint.description} ${(blueprint.integrations ?? []).join(" ")}`.toLowerCase();
  if (/sales|support|customer|finance|invoice|crm|commerce|business|founder|team|operations/.test(corpus)) {
    return "business";
  }
  if (/travel|study|household|subscription|job|personal|life|portfolio|deal/.test(corpus)) {
    return "personal";
  }
  return "both";
}

function mapStepType(step: WorkflowActionStep) {
  if (step.actionType === "skill") {
    return /report|summary|brief/i.test(step.name) ? "report" : "reason";
  }
  if (step.actionType === "send_email" || step.actionType === "compose_text") return "message";
  if (step.actionType === "webhook_request") return "api";
  if (step.actionType === "branch") return "approval";
  return "tool_action";
}

export async function syncWorkflowRuntimeRecords(params: {
  workflowId: string;
  userId: string;
  workflowTitle: string;
  prompt: string;
  status: Workflow["status"];
  blueprint: WorkflowBlueprint;
}) {
  const admin = createAdminSupabaseClient();
  const definition = params.blueprint.definition;
  const audience = inferAudience(params.blueprint);
  const automationStatus =
    params.status === "active" ? "active" : params.status === "paused" ? "paused" : "draft";
  let agentId: string | null = null;

  if (definition?.operator?.enabled) {
    const existingAgent = await admin
      .from("agents")
      .select("id")
      .eq("workflow_id", params.workflowId)
      .maybeSingle();

    const agentPayload = {
      user_id: params.userId,
      workflow_id: params.workflowId,
      name: definition.operator.role || params.workflowTitle,
      role: definition.operator.role || params.workflowTitle,
      objective: definition.operator.objective || params.blueprint.description,
      category: params.blueprint.category || "general",
      audience_type: audience,
      status: automationStatus,
      persona_config: {
        prompt: params.prompt,
        runtime: definition.runtime ?? null,
        operator: definition.operator,
        trigger: definition.trigger,
      },
      autonomy_mode: definition.operator.autonomy,
      default_report_style: definition.runtime?.reportStyle ?? "standard",
    };

    const agentResult = existingAgent.data?.id
      ? await admin
          .from("agents")
          .update(agentPayload)
          .eq("id", existingAgent.data.id)
          .select("id")
          .single()
      : await admin.from("agents").insert(agentPayload).select("id").single();

    agentId = agentResult.data?.id ?? null;
  } else {
    await admin
      .from("agents")
      .update({ status: "archived" })
      .eq("workflow_id", params.workflowId)
      .neq("status", "archived");
  }

  const existingAutomation = await admin
    .from("automations")
    .select("id")
    .eq("workflow_id", params.workflowId)
    .maybeSingle();

  const automationPayload = {
    user_id: params.userId,
    workflow_id: params.workflowId,
    agent_id: agentId,
    name: params.workflowTitle,
    goal: params.blueprint.description,
    status: automationStatus,
    trigger_type:
      definition?.trigger.type === "manual" ||
      definition?.trigger.type === "schedule" ||
      definition?.trigger.type === "webhook"
        ? definition.trigger.type
        : "event",
    trigger_config: definition?.trigger ?? {},
    condition_config: {
      runtime: definition?.runtime ?? null,
    },
    delivery_config: {
      notify_on: definition?.runtime?.notifyOn ?? [],
      report_style: definition?.runtime?.reportStyle ?? "standard",
    },
    schedule_config: definition?.trigger.schedule
      ? { schedule: definition.trigger.schedule }
      : {},
  };

  const automationResult = existingAutomation.data?.id
    ? await admin
        .from("automations")
        .update(automationPayload)
        .eq("id", existingAutomation.data.id)
        .select("id")
        .single()
    : await admin.from("automations").insert(automationPayload).select("id").single();

  const automationId = automationResult.data?.id ?? null;

  if (automationId) {
    await admin.from("automation_steps").delete().eq("automation_id", automationId);

    const stepRows = (definition?.steps ?? []).map((step, index) => ({
      automation_id: automationId,
      position: index,
      step_type: mapStepType(step),
      label: step.name,
      config: {
        app: step.app,
        actionType: step.actionType,
        condition: step.condition ?? null,
        onFailure: step.onFailure ?? "stop",
        saveOutputAs: step.saveOutputAs ?? null,
      },
      enabled: step.enabled,
    }));

    if (stepRows.length > 0) {
      await admin.from("automation_steps").insert(stepRows);
    }
  }

  return { agentId, automationId };
}
