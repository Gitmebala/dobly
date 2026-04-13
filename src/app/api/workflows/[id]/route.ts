import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { getRequiredProviderIdsForWorkflow } from "@/lib/connection-requirements";
import { describeProviderReadinessIssue, findOperationalConnection } from "@/lib/connection-readiness";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { createWorkflowVersion } from "@/lib/versioning";
import { updateWorkflowSchema } from "@/lib/validations";
import type { ApiError, Connection, WorkflowBlueprint } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many write requests." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateWorkflowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: parsed.error.errors[0]?.message ?? "Invalid workflow update" },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const { data: existingWorkflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existingWorkflow) {
    return NextResponse.json<ApiError>({ error: "Workflow not found" }, { status: 404 });
  }

  const blueprint = payload.blueprint
    ? validateWorkflowBlueprintForActivation(payload.blueprint as unknown as WorkflowBlueprint, existingWorkflow.prompt).normalized
    : undefined;
  const definition = blueprint?.definition;
  const requestedStatus = payload.status ?? existingWorkflow.status;

  if (requestedStatus === "active") {
    const candidateBlueprint = blueprint ?? (existingWorkflow.blueprint as WorkflowBlueprint);
    const validation = validateWorkflowBlueprintForActivation(candidateBlueprint, existingWorkflow.prompt);

    if (validation.issues.length > 0) {
      return NextResponse.json<ApiError>(
        { error: validation.issues[0] ?? "Workflow is not ready to activate." },
        { status: 400 }
      );
    }

    const requiredProviders = getRequiredProviderIdsForWorkflow(validation.normalized, existingWorkflow.prompt);
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

  const update = {
    ...(payload.title ? { title: payload.title } : {}),
    ...(payload.description ? { description: payload.description } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(blueprint ? { blueprint } : {}),
    ...(definition?.trigger.type ? { trigger_type: definition.trigger.type } : {}),
    ...(definition?.trigger.webhook_path !== undefined
      ? { webhook_path: definition.trigger.webhook_path || null }
      : {}),
  };

  const { data, error } = await supabase
    .from("workflows")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: "Failed to update workflow" }, { status: 500 });
  }

  if (blueprint) {
    await createWorkflowVersion({
      workflowId: data.id,
      userId: user.id,
      title: data.title,
      description: data.description,
      blueprint: blueprint,
      status: data.status === "draft" ? "draft" : "published",
    }).catch(() => {
      // Keep the update successful even if versioning storage fails.
    });
  }

  return NextResponse.json({ workflow: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(_req));
  if (!rl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many write requests." }, { status: 429 });
  }

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json<ApiError>({ error: "Failed to delete workflow" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
