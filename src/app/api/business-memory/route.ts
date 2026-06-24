import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inferDoblyExecutionIntent } from "@/lib/dobly-inference";
import { doblyIntentSchema } from "@/lib/validations";
import {
  BUSINESS_MEMORY_KINDS,
  BUSINESS_MEMORY_SCOPES,
  normalizeMemoryTags,
  type BusinessMemoryItem,
} from "@/lib/business-memory";
import { checkUsageEntitlement, recordUsageEvent } from "@/lib/billing/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

const memoryKindIds = BUSINESS_MEMORY_KINDS.map((kind) => kind.id) as [
  (typeof BUSINESS_MEMORY_KINDS)[number]["id"],
  ...(typeof BUSINESS_MEMORY_KINDS)[number]["id"][],
];

const memoryScopeIds = BUSINESS_MEMORY_SCOPES as [
  (typeof BUSINESS_MEMORY_SCOPES)[number],
  ...(typeof BUSINESS_MEMORY_SCOPES)[number][],
];

const createMemorySchema = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional().nullable(),
  kind: z.enum(memoryKindIds),
  scope: z.enum(memoryScopeIds).default("global"),
  title: z.string().min(2).max(160),
  body: z.string().min(2).max(8000),
  tags: z.array(z.string().max(40)).optional(),
  source: z.string().max(80).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  department_id: z.enum(["reception", "sales", "marketing", "support", "finance", "operations", "engineering_product", "leadership", "admin"]).optional().nullable(),
  work_type_id: z.enum(["communicate", "research", "create", "coordinate", "build", "monitor", "decide"]).optional().nullable(),
  output_type_id: z.enum(["message", "task", "alert", "brief", "document", "presentation", "spreadsheet_report", "image_design", "video", "code_context_package", "approval_request"]).optional().nullable(),
  trigger_type_id: z.enum(["owner_request", "inbound_signal", "scheduled_trigger", "threshold_alert", "workflow_handoff", "external_event"]).optional().nullable(),
  trust_level_id: z.enum(["informational", "draft_propose", "safe_auto_run", "approval_required", "human_only"]).optional().nullable(),
  memory_scope_id: z.enum(["run", "department", "workspace", "customer", "project", "company"]).optional().nullable(),
  intent: doblyIntentSchema.optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const scope = url.searchParams.get("scope");
  const kind = url.searchParams.get("kind");
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 40)));

  let query = supabase
    .from("business_memory_items")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (scope && BUSINESS_MEMORY_SCOPES.includes(scope as any)) {
    query = query.eq("scope", scope);
  }

  if (kind && BUSINESS_MEMORY_KINDS.some((item) => item.id === kind)) {
    query = query.eq("kind", kind);
  }

  if (q.length > 0) {
    query = query.textSearch("body", q, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      {
        error: "Business memory could not be loaded.",
        setupReady: false,
        setupWarning: "Apply the Dobly business memory schema before using memory.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    items: (data ?? []) as BusinessMemoryItem[],
    kinds: BUSINESS_MEMORY_KINDS,
    scopes: BUSINESS_MEMORY_SCOPES,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = createMemorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid memory item." },
      { status: 400 },
    );
  }

  const usageAllowed = await checkUsageEntitlement({
    userId: user.id,
    workspaceId: validation.data.workspaceId ?? null,
    metric: "memory_items",
  });
  if (!usageAllowed.allowed) {
    return NextResponse.json<ApiError>(
      { error: usageAllowed.reason ?? "Business memory limit reached for this plan." },
      { status: 402 },
    );
  }

  const inferredIntent =
    validation.data.intent ??
    ((validation.data.metadata as Record<string, unknown> | undefined)?.doblyIntent as ReturnType<typeof inferDoblyExecutionIntent> | undefined) ??
    inferDoblyExecutionIntent({
      prompt: `${validation.data.title}. ${validation.data.body}`,
      explicit: {
        departmentId:
          validation.data.department_id ??
          (validation.data.scope === "marketing" ? "marketing" :
          validation.data.scope === "support" ? "support" :
          validation.data.scope === "finance" ? "finance" :
          validation.data.scope === "sales" ? "sales" :
          validation.data.scope === "reception" ? "reception" :
          validation.data.scope === "operations" ? "operations" :
          validation.data.scope === "boardroom" ? "leadership" :
          "admin"),
        workTypeId: validation.data.work_type_id ?? "decide",
        outputTypeId: validation.data.output_type_id ?? "brief",
        triggerTypeId: validation.data.trigger_type_id ?? undefined,
        trustLevelId: validation.data.trust_level_id ?? undefined,
        memoryScopeId: validation.data.memory_scope_id ?? undefined,
      },
    });

  const payload = {
    workspace_id: validation.data.workspaceId ?? null,
    user_id: user.id,
    kind: validation.data.kind,
    scope: validation.data.scope,
    title: validation.data.title.trim(),
    body: validation.data.body.trim(),
    tags: normalizeMemoryTags(validation.data.tags ?? []),
    source: validation.data.source ?? "manual",
    confidence: validation.data.confidence ?? 1,
    metadata: {
      ...(validation.data.metadata ?? {}),
      doblyIntent: inferredIntent,
    },
    department_id: inferredIntent.departmentId,
    work_type_id: inferredIntent.workTypeId,
    output_type_id: inferredIntent.outputTypeId,
    trigger_type_id: inferredIntent.triggerTypeId,
    trust_level_id: inferredIntent.trustLevelId,
    memory_scope_id: inferredIntent.memoryScopeId,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from("business_memory_items")
    .insert(payload)
    .select("*")
    .single();

  if (error && /column .* does not exist|Could not find the '.*' column/i.test(error.message)) {
    const {
      department_id: _departmentId,
      work_type_id: _workTypeId,
      output_type_id: _outputTypeId,
      trigger_type_id: _triggerTypeId,
      trust_level_id: _trustLevelId,
      memory_scope_id: _memoryScopeId,
      ...compatPayload
    } = payload;

    const compatResult = await supabase
      .from("business_memory_items")
      .insert(compatPayload)
      .select("*")
      .single();

    data = compatResult.data;
    error = compatResult.error;
  }

  if (error || !data) {
    return NextResponse.json(
      {
        error: "Business memory could not be saved.",
        setupReady: false,
        setupWarning: "Apply the Dobly business memory schema before using memory.",
      },
      { status: 503 },
    );
  }

  await recordUsageEvent({
    userId: user.id,
    workspaceId: validation.data.workspaceId ?? null,
    metric: "memory_items",
    source: "business_memory.create",
    metadata: { kind: validation.data.kind, scope: validation.data.scope },
  });

  return NextResponse.json({ item: data as BusinessMemoryItem });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = createMemorySchema.safeParse(body);
  if (!validation.success || !validation.data.id) {
    return NextResponse.json<ApiError>(
      { error: "A valid memory id and payload are required." },
      { status: 400 },
    );
  }

  const inferredIntent =
    validation.data.intent ??
    ((validation.data.metadata as Record<string, unknown> | undefined)?.doblyIntent as ReturnType<typeof inferDoblyExecutionIntent> | undefined) ??
    inferDoblyExecutionIntent({
      prompt: `${validation.data.title}. ${validation.data.body}`,
      explicit: {
        departmentId:
          validation.data.department_id ??
          (validation.data.scope === "marketing" ? "marketing" :
          validation.data.scope === "support" ? "support" :
          validation.data.scope === "finance" ? "finance" :
          validation.data.scope === "sales" ? "sales" :
          validation.data.scope === "reception" ? "reception" :
          validation.data.scope === "operations" ? "operations" :
          validation.data.scope === "boardroom" ? "leadership" :
          "admin"),
        workTypeId: validation.data.work_type_id ?? "decide",
        outputTypeId: validation.data.output_type_id ?? "brief",
        triggerTypeId: validation.data.trigger_type_id ?? undefined,
        trustLevelId: validation.data.trust_level_id ?? undefined,
        memoryScopeId: validation.data.memory_scope_id ?? undefined,
      },
    });

  const payload = {
    workspace_id: validation.data.workspaceId ?? null,
    kind: validation.data.kind,
    scope: validation.data.scope,
    title: validation.data.title.trim(),
    body: validation.data.body.trim(),
    tags: normalizeMemoryTags(validation.data.tags ?? []),
    source: validation.data.source ?? "manual",
    confidence: validation.data.confidence ?? 1,
    metadata: {
      ...(validation.data.metadata ?? {}),
      doblyIntent: inferredIntent,
    },
    department_id: inferredIntent.departmentId,
    work_type_id: inferredIntent.workTypeId,
    output_type_id: inferredIntent.outputTypeId,
    trigger_type_id: inferredIntent.triggerTypeId,
    trust_level_id: inferredIntent.trustLevelId,
    memory_scope_id: inferredIntent.memoryScopeId,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from("business_memory_items")
    .update(payload)
    .eq("id", validation.data.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error && /column .* does not exist|Could not find the '.*' column/i.test(error.message)) {
    const {
      department_id: _departmentId,
      work_type_id: _workTypeId,
      output_type_id: _outputTypeId,
      trigger_type_id: _triggerTypeId,
      trust_level_id: _trustLevelId,
      memory_scope_id: _memoryScopeId,
      ...compatPayload
    } = payload;

    const compatResult = await supabase
      .from("business_memory_items")
      .update(compatPayload)
      .eq("id", validation.data.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    data = compatResult.data;
    error = compatResult.error;
  }

  if (error || !data) {
    return NextResponse.json(
      {
        error: "Business memory could not be updated.",
        setupReady: false,
        setupWarning: "Apply the Dobly business memory schema before editing memory.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ item: data as BusinessMemoryItem });
}
