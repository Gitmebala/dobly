import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { enqueueWorkflowRun, processQueue } from "@/lib/queue";
import type { ApiError, Workflow } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  const { path } = await params;
  const supabase = createAdminSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const rl = rateLimits.webhook(`${path}:${getRequestIp(req)}`);
  if (!rl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many webhook requests." }, { status: 429 });
  }

  const { data: workflow, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("webhook_path", path)
    .eq("status", "active")
    .single();

  if (error || !workflow) {
    return NextResponse.json<ApiError>({ error: "Webhook not found" }, { status: 404 });
  }

  const expectedSecret = String(workflow.blueprint?.definition?.trigger?.config?.secret ?? "").trim();
  const providedSecret = req.headers.get("x-dobly-webhook-secret")?.trim() ?? "";

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json<ApiError>({ error: "Invalid webhook secret." }, { status: 401 });
  }

  try {
    const job = await enqueueWorkflowRun({
      workflow: workflow as Workflow,
      triggerPayload: body,
      trigger: {
      ...(workflow.blueprint?.definition?.trigger ?? {
        type: "webhook",
        label: workflow.title,
        webhook_path: path,
      }),
      type: "webhook",
      },
      priority: 50,
    });

    const processed = await processQueue(1, "dobly-webhook-runner", [job.id]);

    return NextResponse.json({ accepted: true, job, processed });
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Webhook execution failed" },
      { status: 500 }
    );
  }
}
