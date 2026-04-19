import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateWorkflowBlueprint } from "@/lib/anthropic";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { createWorkflowVersion } from "@/lib/versioning";
import { rateLimits } from "@/lib/rate-limit";
import { canCreateWorkflow } from "@/lib/plans";
import { findOperationalConnection } from "@/lib/connection-readiness";
import { generateWorkflowSchema } from "@/lib/validations";
import { getWorkflowConnectionStrategy } from "@/lib/provider-strategy";
import type { GenerateWorkflowResponse, ApiError, Connection } from "@/types";

export async function POST(req: NextRequest) {
  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ── 2. Rate limiting ───────────────────────────────────────────────────────
  const rl = rateLimits.generate(user.id);
  if (!rl.allowed) {
    return NextResponse.json<ApiError>(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // ── 3. Input validation ────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const validation = generateWorkflowSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { prompt } = validation.data;

  // ── 4. Plan limit check ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const { data: businessProfile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json<ApiError>(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  const workflowAllowance = await canCreateWorkflow(user.id, profile.plan);
  if (!workflowAllowance.allowed) {
    return NextResponse.json<ApiError>(
      {
        error: `You've reached the ${workflowAllowance.plan.max_workflows} workflow limit on your ${workflowAllowance.plan.name} plan. Upgrade to launch more automations.`,
        code: "LIMIT_REACHED",
      },
      { status: 403 }
    );
  }

  // ── 5. Generate workflow ───────────────────────────────────────────────────
  let blueprint;
  try {
    blueprint = await generateWorkflowBlueprint(prompt, user.id, businessProfile ?? null);
    const validated = validateWorkflowBlueprintForActivation(blueprint, prompt);
    blueprint = validated.normalized;
  } catch (err) {
    console.error("Workflow generation error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to generate workflow. Please try again." },
      { status: 500 }
    );
  }

  // ── 6. Save to database ────────────────────────────────────────────────────
  const { data: workflow, error: insertError } = await supabase
    .from("workflows")
    .insert({
      user_id: user.id,
      title: blueprint.name,
      description: blueprint.description,
      prompt,
      blueprint,
      status: "draft",
      trigger_type: blueprint.definition?.trigger.type ?? "manual",
      webhook_path: blueprint.definition?.trigger.webhook_path ?? null,
      time_saved_minutes: parseTimeSaved(blueprint.estimated_time_saved),
    })
    .select("id")
    .single();

  if (insertError || !workflow) {
    console.error("Database insert error:", insertError);
    return NextResponse.json<ApiError>(
      { error: "Failed to save workflow" },
      { status: 500 }
    );
  }

  await createWorkflowVersion({
    workflowId: workflow.id,
    userId: user.id,
    title: blueprint.name,
    description: blueprint.description,
    blueprint,
    status: "draft",
  }).catch(() => {
    // Non-critical, main workflow record already exists.
  });

  // ── 7. Log usage ───────────────────────────────────────────────────────────
  await supabase.from("usage_logs").insert({
    user_id: user.id,
    action: "generate_workflow",
    metadata: { workflow_id: workflow.id, prompt_length: prompt.length },
  });

  // ── 8. Increment counter on profile ───────────────────────────────────────
  try {
    await supabase.rpc("increment_workflows_generated", { p_user_id: user.id });
  } catch {
    // Non-critical, ignore error
  }

  const connectionStrategy = getWorkflowConnectionStrategy(blueprint, prompt);
  const requiredProviders = connectionStrategy.requiredProviders.map((provider) => provider.providerId);
  const { data: activeConnections } = await supabase
    .from("connections")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "active", "expired", "error"]);

  const connections = (activeConnections ?? []) as Connection[];
  const missingProviders = requiredProviders.filter(
    (provider) => !findOperationalConnection(connections, provider)
  );

  return NextResponse.json<GenerateWorkflowResponse>({
    workflow: blueprint,
    workflow_id: workflow.id,
    missing_providers: missingProviders,
    connection_strategy: {
      likely_category: blueprint.category,
      required_provider_ids: connectionStrategy.requiredProviders.map((provider) => provider.providerId),
      optional_provider_ids: connectionStrategy.optionalProviders.map((provider) => provider.providerId),
      managed_capability_ids: connectionStrategy.managedCapabilities.map((capability) => capability.id),
    },
    next_url: missingProviders.length > 0 ? `/dashboard/workflows/${workflow.id}/connections` : `/dashboard/workflows/${workflow.id}/activate`,
  });
}

// Helper: parse "3 hours/week" → minutes/week
function parseTimeSaved(str: string): number {
  if (!str) return 0;
  const lower = str.toLowerCase();
  const num = parseFloat(lower.match(/[\d.]+/)?.[0] ?? "0");
  if (lower.includes("hour")) return num * 60;
  if (lower.includes("min")) return num;
  if (lower.includes("day")) return num * 60 * 8;
  return num * 60; // default: treat as hours
}
