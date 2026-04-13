import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { getRequiredProviderIdsForWorkflow } from "@/lib/connection-requirements";
import { describeProviderReadinessIssue, findOperationalConnection } from "@/lib/connection-readiness";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { updateWorkflowSchema } from "@/lib/validations";
import type { ApiError, Connection, WorkflowBlueprint } from "@/types";

// GET /api/workflows — list user's workflows
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const readRl = rateLimits.api(user.id);
  if (!readRl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  let query = supabase
    .from("workflows")
    .select("*")
    // RLS guarantees only the user's own workflows — this is defense in depth
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ["active", "paused", "draft"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Workflows fetch error:", error);
    return NextResponse.json<ApiError>({ error: "Failed to fetch workflows" }, { status: 500 });
  }

  return NextResponse.json({ workflows: data ?? [] });
}

// PATCH /api/workflows?id=xxx — update a workflow
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const writeRl = rateLimits.write(user.id || getRequestIp(req));
  if (!writeRl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many write requests." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || typeof id !== "string") {
    return NextResponse.json<ApiError>({ error: "Workflow ID required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>({ error: "Invalid request body" }, { status: 400 });
  }

  const validation = updateWorkflowSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: existingWorkflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existingWorkflow) {
    return NextResponse.json<ApiError>({ error: "Workflow not found" }, { status: 404 });
  }

  const blueprint = validation.data.blueprint
    ? validateWorkflowBlueprintForActivation(validation.data.blueprint as unknown as WorkflowBlueprint, existingWorkflow.prompt).normalized
    : undefined;

  const requestedStatus = validation.data.status ?? existingWorkflow.status;
  if (requestedStatus === "active") {
    const candidateBlueprint = blueprint ?? (existingWorkflow.blueprint as WorkflowBlueprint);
    const workflowValidation = validateWorkflowBlueprintForActivation(candidateBlueprint, existingWorkflow.prompt);

    if (workflowValidation.issues.length > 0) {
      return NextResponse.json<ApiError>(
        { error: workflowValidation.issues[0] ?? "Workflow is not ready to activate." },
        { status: 400 }
      );
    }

    const requiredProviders = getRequiredProviderIdsForWorkflow(workflowValidation.normalized, existingWorkflow.prompt);
    const { data: activeConnections } = await supabase
      .from("connections")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "active", "expired", "error"]);

    const connections = (activeConnections ?? []) as Connection[];
    const missingProviders = requiredProviders.filter(
      (provider) => !findOperationalConnection(connections, provider)
    );

    if (missingProviders.length > 0) {
      return NextResponse.json<ApiError>(
        {
          error: `Connect the missing tools before activating this workflow: ${missingProviders.join(", ")}. ${missingProviders
            .map((provider) => `${provider}: ${describeProviderReadinessIssue(connections, provider)}`)
            .join(" ")}`,
        },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("workflows")
    .update({
      ...validation.data,
      ...(blueprint ? { blueprint } : {}),
      ...(blueprint?.definition?.trigger.type ? { trigger_type: blueprint.definition.trigger.type } : {}),
      ...(blueprint?.definition?.trigger.webhook_path !== undefined
        ? { webhook_path: blueprint.definition.trigger.webhook_path || null }
        : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id) // defense in depth on top of RLS
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>({ error: "Failed to update workflow" }, { status: 500 });
  }

  return NextResponse.json({ workflow: data });
}

// DELETE /api/workflows?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const writeRl = rateLimits.write(user.id || getRequestIp(req));
  if (!writeRl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many write requests." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json<ApiError>({ error: "Workflow ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // defense in depth

  if (error) {
    return NextResponse.json<ApiError>({ error: "Failed to delete workflow" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
