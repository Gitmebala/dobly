import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createDecision,
  updateDecision,
  getDecisions,
  analyzeDecisionPattern,
  getDecisionLearningSummary,
  getDecisionRecommendation,
  applyLearnedPattern,
} from "@/lib/decisions/service";
import type { DecisionOutcome } from "@/types";

// GET /api/decisions - Get decisions for the authenticated user
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
    const situationType = searchParams.get("situationType");
    const outcome = searchParams.get("outcome") as DecisionOutcome | null;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const summary = searchParams.get("summary") === "true";
    const analyze = searchParams.get("analyze") === "true";
    const recommendation = searchParams.get("recommendation") === "true";

    if (summary) {
      const summaryData = await getDecisionLearningSummary(user.id);
      return NextResponse.json(summaryData);
    }

    if (analyze && situationType) {
      const analysis = await analyzeDecisionPattern({
        situationType,
        userId: user.id,
        limit,
      });
      return NextResponse.json(analysis);
    }

    if (recommendation && coworkerId && situationType) {
      const body = await req.json();
      const { context } = body;
      const rec = await getDecisionRecommendation(
        coworkerId,
        user.id,
        situationType,
        context || {}
      );
      return NextResponse.json(rec);
    }

    const decisions = await getDecisions(user.id, {
      coworkerId: coworkerId || undefined,
      situationType: situationType || undefined,
      outcome: outcome || undefined,
      limit,
    });

    return NextResponse.json({ decisions });
  } catch (error) {
    console.error("Error fetching decisions:", error);
    return NextResponse.json(
      { error: "Failed to fetch decisions" },
      { status: 500 }
    );
  }
}

// POST /api/decisions - Create a new decision record
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
    const {
      coworkerId,
      situationType,
      context,
      doblyRecommendation,
      doblyConfidence,
      ownerChoice,
      ownerReasoning,
    } = body;

    if (!situationType || !context || !doblyRecommendation || !ownerChoice) {
      return NextResponse.json(
        { error: "Missing required fields: situationType, context, doblyRecommendation, ownerChoice" },
        { status: 400 }
      );
    }

    const decision = await createDecision({
      userId: user.id,
      coworkerId,
      situationType,
      context,
      doblyRecommendation,
      doblyConfidence: doblyConfidence || 0.5,
      ownerChoice,
      ownerReasoning,
    });

    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    console.error("Error creating decision:", error);
    return NextResponse.json(
      { error: "Failed to create decision" },
      { status: 500 }
    );
  }
}
