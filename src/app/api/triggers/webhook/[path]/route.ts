import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { enqueueWorkflowRun } from "@/lib/queue";
import type { ApiError, Workflow } from "@/types";
import { secureSecretMatches } from "@/lib/security/secrets";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  const { path } = await params;
  if (!/^[a-zA-Z0-9_-]{3,128}$/.test(path)) {
    return NextResponse.json<ApiError>({ error: "Webhook not found" }, { status: 404 });
  }
  const supabase = createAdminSupabaseClient();
  const rl = rateLimits.webhook(`${path}:${getRequestIp(req)}`);
  if (!rl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many webhook requests." }, { status: 429 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json<ApiError>({ error: "Webhook payload is too large." }, { status: 413 });
  }
  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json<ApiError>({ error: "Webhook payload is too large." }, { status: 413 });
  }
  let body: Record<string, unknown> = {};
  if (rawBody.trim()) {
    try {
      const parsedBody: unknown = JSON.parse(rawBody);
      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        return NextResponse.json<ApiError>({ error: "Webhook payload must be a JSON object." }, { status: 400 });
      }
      body = parsedBody as Record<string, unknown>;
    } catch {
      return NextResponse.json<ApiError>({ error: "Webhook payload must be valid JSON." }, { status: 400 });
    }
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

  if (!secureSecretMatches(expectedSecret, providedSecret)) {
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

    return NextResponse.json(
      { accepted: true, jobId: job.id },
      { status: 202, headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Webhook execution failed" },
      { status: 500 }
    );
  }
}
