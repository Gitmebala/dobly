import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildOperatorDefaults, createDefaultAgentConfig, mergeAgentConfig } from "@/lib/agent-config";
import { partialAgentConfigSchema } from "@/lib/validations";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const workflowId = params.id;

  const { data: workflow, error } = await supabase
    .from("workflows")
    .select("blueprint")
    .eq("id", workflowId)
    .eq("user_id", user.id)
    .single();

  if (error || !workflow) {
    return new Response(JSON.stringify({ error: "Workflow not found" }), { status: 404 });
  }

  const existingAgentConfig = workflow.blueprint?.definition?.operator?.agentConfig;
  const agentConfig = createDefaultAgentConfig(workflow.blueprint, existingAgentConfig, workflowId);

  return new Response(JSON.stringify({ agentConfig }), { status: 200 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const workflowId = params.id;
  const body = await request.json();
  const agentConfigPatch = body?.agentConfig ?? body?.blueprint?.definition?.operator?.agentConfig ?? {};
  const resetFromDepartmentPreset = body?.resetFromDepartmentPreset === true;

  const validation = partialAgentConfigSchema.safeParse(agentConfigPatch);
  if (!validation.success) {
    return new Response(JSON.stringify({ errors: validation.error.flatten() }), {
      status: 400,
    });
  }

  // Fetch current workflow
  const { data: workflow, error: fetchError } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !workflow) {
    return new Response(JSON.stringify({ error: "Workflow not found" }), { status: 404 });
  }

  const existingAgentConfig = workflow.blueprint?.definition?.operator?.agentConfig;
  const departmentOverride = validation.data.profile?.department;
  const baseAgentConfig =
    resetFromDepartmentPreset && departmentOverride
      ? createDefaultAgentConfig(
          workflow.blueprint,
          {
            profile: {
              department: departmentOverride,
              role: validation.data.profile?.role || "",
              industry: validation.data.profile?.industry || "",
              businessName: validation.data.profile?.businessName || "",
              description: validation.data.profile?.description || "",
              firstMessage: validation.data.profile?.firstMessage || "",
              successSignal: validation.data.profile?.successSignal || "",
            },
          },
          workflowId
        )
      : createDefaultAgentConfig(workflow.blueprint, existingAgentConfig, workflowId);
  const nextAgentConfig = mergeAgentConfig(baseAgentConfig, validation.data);
  const existingOperator = workflow.blueprint?.definition?.operator;

  const updatedBlueprint = {
    ...workflow.blueprint,
    definition: {
      ...workflow.blueprint?.definition,
      operator: existingOperator
        ? {
            ...existingOperator,
            role: nextAgentConfig.profile.role || existingOperator.role,
            objective: workflow.blueprint?.description || existingOperator.objective,
            agentConfig: nextAgentConfig,
          }
        : buildOperatorDefaults(workflow.blueprint, nextAgentConfig),
    },
  };

  const { data: updated, error: updateError } = await supabase
    .from("workflows")
    .update({
      blueprint: updatedBlueprint,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflowId)
    .select()
    .single();

  if (updateError) {
    return new Response(JSON.stringify({ error: "Failed to update workflow" }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ workflow: updated }), { status: 200 });
}
