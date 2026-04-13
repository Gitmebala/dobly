import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { getRequiredProviderIdsForWorkflow } from "@/lib/connection-requirements";
import { describeProviderReadinessIssue, findOperationalConnection } from "@/lib/connection-readiness";
import { canConsumeStandardExecution } from "@/lib/plans";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enqueueWorkflowRun, processQueue } from "@/lib/queue";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { triggerPayloadSchema } from "@/lib/validations";
import type { ApiError, Connection, Workflow } from "@/types";

export async function POST(
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
    return NextResponse.json<ApiError>({ error: "Too many run requests." }, { status: 429 });
  }

  const { data: workflow, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !workflow) {
    return NextResponse.json<ApiError>({ error: "Workflow not found" }, { status: 404 });
  }

  if (workflow.status !== "active") {
    return NextResponse.json<ApiError>(
      { error: "Only active workflows can run. Review and activate this workflow first." },
      { status: 400 }
    );
  }

  const validation = validateWorkflowBlueprintForActivation(workflow.blueprint, workflow.prompt);
  if (validation.issues.length > 0) {
    return NextResponse.json<ApiError>(
      { error: validation.issues[0] ?? "Workflow is not ready to run." },
      { status: 400 }
    );
  }

  const requiredProviders = getRequiredProviderIdsForWorkflow(validation.normalized, workflow.prompt);
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
    const providerDetails = missingProviders
      .map((provider) => `${provider}: ${describeProviderReadinessIssue(connections, provider)}`)
      .join(" ");
    return NextResponse.json<ApiError>(
      {
        error: `This workflow still needs deploy-ready tools before it can run: ${missingProviders.join(", ")}. ${providerDetails}`,
      },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const executionAllowance = await canConsumeStandardExecution(
    user.id,
    (profile?.plan ?? "free") as "free" | "starter" | "pro" | "agency"
  );

  if (!executionAllowance.allowed) {
    return NextResponse.json<ApiError>(
      {
        error: `This automation is paused because you've used your ${executionAllowance.usage.standard_executions_limit} standard executions this month. Upgrade to continue and replay immediately.`,
        code: "EXECUTION_LIMIT_REACHED",
      },
      { status: 403 }
    );
  }

  const rawBody = await req.json().catch(() => ({}));
  const parsedPayload = triggerPayloadSchema.safeParse(rawBody);

  if (!parsedPayload.success) {
    return NextResponse.json<ApiError>({ error: "Invalid trigger payload" }, { status: 400 });
  }

  try {
    const job = await enqueueWorkflowRun({
      workflow: workflow as Workflow,
      triggerPayload: parsedPayload.data,
    });

    const processed = await processQueue(1, "dobly-manual-runner", [job.id]);
    return NextResponse.json({
      accepted: true,
      job,
      processed,
    });
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Workflow execution failed" },
      { status: 500 }
    );
  }
}
