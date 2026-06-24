import { NextRequest, NextResponse } from "next/server";
import { generateWorkflowBlueprint } from "@/lib/anthropic";
import { resolveDoblyCapabilities } from "@/lib/capability-resolver";
import { findOperationalConnection } from "@/lib/connection-readiness";
import { buildDoblyGenerationBrief } from "@/lib/dobly-ops";
import { attachDoblyOperatingModel, buildDoblyOperatingModel, DOBLY_WORK_TALENTS } from "@/lib/dobly-operating-model";
import { analyzePromptDesign, buildGenerationDesignBrief } from "@/lib/generation";
import { canCreateWorkflow } from "@/lib/plans";
import { buildAndStorePodDraft } from "@/lib/pods/service";
import { getWorkflowConnectionStrategy } from "@/lib/provider-strategy";
import { rateLimits } from "@/lib/rate-limit";
import { syncWorkflowRuntimeRecords } from "@/lib/runtime/records";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateWorkflowSchema } from "@/lib/validations";
import { createWorkflowVersion } from "@/lib/versioning";
import { validateWorkflowBlueprintForActivation } from "@/lib/workflow-definition";
import { getDoblyVerticalById } from "@/lib/verticals";
import type { ApiError, Connection, GenerateWorkflowResponse } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

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
      },
    );
  }

  const body = await req.json().catch(() => null);
  const validation = generateWorkflowSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { prompt, clarifications, operatorModel } = validation.data;
  const analysis = analyzePromptDesign(prompt);
  const vertical = getDoblyVerticalById(analysis.verticalId);

  const [{ data: profile }, { data: businessProfile }, { data: existingWorkflows }, { data: existingConnections }] =
    await Promise.all([
      supabase.from("profiles").select("plan, notification_preference").eq("id", user.id).single(),
      supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("workflows").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("connections").select("*").eq("user_id", user.id),
    ]);

  if (!profile) {
    return NextResponse.json<ApiError>({ error: "Profile not found" }, { status: 404 });
  }

  const workflowAllowance = await canCreateWorkflow(user.id, profile.plan);
  if (!workflowAllowance.allowed) {
    return NextResponse.json<ApiError>(
      {
        error: `You've reached the ${workflowAllowance.plan.max_workflows} workflow limit on your ${workflowAllowance.plan.name} plan. Upgrade to launch more automations.`,
        code: "LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const enrichedPrompt = buildGenerationDesignBrief(
    prompt,
    {
      ...analysis,
      operatorModel: operatorModel ?? analysis.operatorModel,
    },
    clarifications,
    {
      businessProfile: businessProfile ?? null,
      workflows: existingWorkflows ?? [],
      connections: existingConnections ?? [],
      profile: profile ?? null,
    },
  );

  let blueprint;
  try {
    blueprint = await generateWorkflowBlueprint(enrichedPrompt, user.id, businessProfile ?? null);
    const validated = validateWorkflowBlueprintForActivation(blueprint, enrichedPrompt);
    blueprint = validated.normalized;
  } catch (error) {
    console.error("Workflow generation error:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "UnknownError",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json<ApiError>(
      { error: "Failed to generate workflow. Please try again." },
      { status: 500 },
    );
  }

  const activeConnections = (existingConnections ?? []) as Connection[];
  const capabilityPlan = resolveDoblyCapabilities({
    prompt,
    blueprint,
    connections: activeConnections,
    vertical,
  });
  const connectionStrategy = getWorkflowConnectionStrategy(blueprint, enrichedPrompt);
  const requiredProviders = Array.from(
    new Set([
      ...connectionStrategy.requiredProviders.map((provider) => provider.providerId),
      ...capabilityPlan.needed_now_provider_ids,
    ]),
  );
  const missingProviders = requiredProviders.filter(
    (provider) => !findOperationalConnection(activeConnections, provider),
  );
  const operatingModel = buildDoblyOperatingModel({
    prompt,
    analysis,
    vertical,
    clarifications,
    requiredProviders: missingProviders,
    optionalProviders: connectionStrategy.optionalProviders.map((provider) => provider.label),
  });
  blueprint = attachDoblyOperatingModel(blueprint, operatingModel);

  const { data: workflow, error: insertError } = await supabase
    .from("workflows")
    .insert({
      user_id: user.id,
      title: blueprint.name,
      description: blueprint.description,
      prompt: enrichedPrompt,
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
    return NextResponse.json<ApiError>({ error: "Failed to save workflow" }, { status: 500 });
  }

  await createWorkflowVersion({
    workflowId: workflow.id,
    userId: user.id,
    title: blueprint.name,
    description: blueprint.description,
    blueprint,
    status: "draft",
  }).catch(() => undefined);

  await syncWorkflowRuntimeRecords({
    workflowId: workflow.id,
    userId: user.id,
    workflowTitle: blueprint.name,
    prompt: enrichedPrompt,
    status: "draft",
    blueprint,
  }).catch(() => undefined);

  const podDraft = await buildAndStorePodDraft(supabase as any, {
    userId: user.id,
    prompt,
    businessProfile: businessProfile ?? null,
    connections: activeConnections,
  }).catch((error) => ({
    pod: null,
    spec: undefined,
    error: error instanceof Error ? error.message : "Pod generation failed.",
  }));

  await supabase.from("usage_logs").insert({
    user_id: user.id,
    action: "generate_workflow",
    metadata: { workflow_id: workflow.id, prompt_length: prompt.length },
  });

  try {
    await supabase.rpc("increment_workflows_generated", { p_user_id: user.id });
  } catch {
    // Non-critical.
  }

  const firstValueChecklist = [
    ...(vertical
      ? [
          `Confirm the ${vertical.title.toLowerCase()} defaults match how you actually operate.`,
          `Answer the key setup questions for this vertical: ${vertical.onboardingQuestions
            .map((question) => question.label)
            .slice(0, 2)
            .join(" / ")}.`,
        ]
      : []),
    "Review the workflow draft and confirm the trigger is correct.",
    capabilityPlan.summary.one_unlock > 0
      ? `Dobly can already cover part of this now. Unlock only the missing live paths when you are ready.`
      : "Dobly can handle this with the current stack, so you can test immediately.",
    "Run a dry test before turning on live execution.",
    "Turn on approvals for any messages, payouts, refunds, or sensitive updates.",
  ];

  const generationBrief = buildDoblyGenerationBrief({
    prompt,
    operatorModel: operatorModel ?? analysis.operatorModel,
    classificationReason: analysis.classificationReason,
    businessProfile: businessProfile ?? null,
    workflows: existingWorkflows ?? [],
    connections: activeConnections,
    notificationPreference: profile.notification_preference ?? null,
    clarifications,
  });

  return NextResponse.json<GenerateWorkflowResponse>(
    {
      workflow: blueprint,
      workflow_id: workflow.id,
      pod_id: podDraft.pod?.id ?? null,
      pod_spec: podDraft.spec,
      pod_warning: podDraft.error,
      missing_providers: missingProviders,
      connection_strategy: {
        likely_category: blueprint.category,
        required_provider_ids: connectionStrategy.requiredProviders.map((provider) => provider.providerId),
        optional_provider_ids: connectionStrategy.optionalProviders.map((provider) => provider.providerId),
        managed_capability_ids: connectionStrategy.managedCapabilities.map((capability) => capability.id),
      },
      classification: {
        operator_model: operatorModel ?? analysis.operatorModel,
        explanation: analysis.classificationReason,
        primary_segment: analysis.primarySegment,
      },
      explanation: {
        what_this_is: generationBrief.whatThisIs,
        why_built_this_way: generationBrief.whyBuiltThisWay,
        what_happens_next: generationBrief.whatHappensNext,
        assumptions: generationBrief.assumptions,
        approval_points: generationBrief.approvalPoints,
        failure_modes: generationBrief.failureModes,
        confidence: generationBrief.confidence,
        confidence_label: generationBrief.confidenceLabel,
        confidence_reason: generationBrief.confidenceReason,
        defaults: {
          operator_type: generationBrief.defaults.operatorType,
          trigger_strategy: generationBrief.defaults.triggerStrategy,
          approval_policy: generationBrief.defaults.approvalPolicy,
          retry_policy: generationBrief.defaults.retryPolicy,
          first_connection: generationBrief.defaults.firstConnection,
        },
      },
      workspace_memory: generationBrief.workspaceMemory,
      policy_summary: generationBrief.policySummary,
      first_value_checklist: firstValueChecklist,
      next_url: podDraft.pod?.id
        ? `/dashboard/pods/${podDraft.pod.id}`
        : missingProviders.length > 0
          ? "/dashboard/connections"
          : `/dashboard/workflows/${workflow.id}`,
      vertical: vertical
        ? {
            id: vertical.id,
            title: vertical.title,
            tagline: vertical.tagline,
            purpose: vertical.purpose,
            recommended_connections: vertical.recommendedConnections,
            toolkit: vertical.toolkit,
            workflow_logic: vertical.workflowLogic,
            memory_fields: vertical.memoryFields,
            approval_rules: vertical.approvalRules,
            outputs: vertical.outputs,
            onboarding_questions: vertical.onboardingQuestions,
          }
        : undefined,
      operating_model: {
        ...operatingModel,
        work_talents: operatingModel.work_talents.map((talentId) => {
          const talent = DOBLY_WORK_TALENTS.find((item) => item.id === talentId);
          return {
            id: talentId,
            title: talent?.title ?? talentId,
            summary: talent?.summary ?? "",
            capabilities: talent?.capabilities ?? [],
          };
        }),
      },
      capability_plan: capabilityPlan,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}

function parseTimeSaved(str: string): number {
  if (!str) return 0;
  const lower = str.toLowerCase();
  const num = parseFloat(lower.match(/[\d.]+/)?.[0] ?? "0");
  if (lower.includes("hour")) return num * 60;
  if (lower.includes("min")) return num;
  if (lower.includes("day")) return num * 60 * 8;
  return num * 60;
}
