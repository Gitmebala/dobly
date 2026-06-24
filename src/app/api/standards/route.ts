import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { standardCreateSchema } from "@/lib/validations";
import {
  createStandard,
  getStandards,
  updateStandard,
  deleteStandard,
  promiseToStandard,
  bindStandardsToCoworker,
} from "@/lib/standards/service";
import type { StandardCategory, EnforcementMode } from "@/types";

// GET /api/standards - Get all standards for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const coworkerId = searchParams.get("coworkerId");
    const category = searchParams.get("category") as StandardCategory | null;
    const isActive = searchParams.get("isActive") === "true" ? true : searchParams.get("isActive") === "false" ? false : undefined;

    const standards = await getStandards(user.id, {
      coworkerId: coworkerId || undefined,
      category: category || undefined,
      isActive,
    });

    return NextResponse.json({ standards });
  } catch (error) {
    console.error("Error fetching standards:", error);
    return NextResponse.json(
      { error: "Failed to fetch standards" },
      { status: 500 }
    );
  }
}

// POST /api/standards - Create a new standard
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = standardCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid standard." },
        { status: 400 }
      );
    }
    const payload = parsed.data;

    const standard = await createStandard({
      userId: user.id,
      coworkerId: payload.coworker_id ?? undefined,
      name: payload.name,
      description: undefined,
      category: (payload.department_id === "finance" ? "payment" : payload.department_id === "support" ? "communication" : "quality") as StandardCategory,
      promise: payload.promise,
      metric: payload.metric_name ?? "operating_consistency",
      targetValue: Number(payload.target_value ?? "1"),
      unit: undefined,
      appliesTo: {
        deskId: payload.desk_id ?? null,
        departmentId: payload.department_id ?? null,
        workTypeId: payload.work_type_id ?? null,
        outputTypeId: payload.output_type_id ?? null,
        triggerTypeId: payload.trigger_type_id ?? null,
        trustLevelId: payload.trust_level_id ?? null,
        memoryScopeId: payload.memory_scope_id ?? null,
      },
      exceptions: {},
      enforcementMode: "soft" as EnforcementMode,
      escalationThreshold: payload.escalation_rule ? { summary: payload.escalation_rule } : {},
      intent: payload.intent,
    });

    return NextResponse.json({ standard }, { status: 201 });
  } catch (error) {
    console.error("Error creating standard:", error);
    return NextResponse.json(
      { error: "Failed to create standard" },
      { status: 500 }
    );
  }
}
