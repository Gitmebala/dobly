import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateWorkflowSchema } from "@/lib/validations";

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

  const agentConfig = workflow.blueprint?.definition?.operator?.agentConfig;

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

  // Validate the update
  const validation = updateWorkflowSchema.safeParse({ blueprint: body.blueprint });
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

  // Update the workflow
  const updatedBlueprint = {
    ...workflow.blueprint,
    definition: {
      ...workflow.blueprint?.definition,
      operator: {
        ...workflow.blueprint?.definition?.operator,
        agentConfig: body.blueprint.definition?.operator?.agentConfig,
      },
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
