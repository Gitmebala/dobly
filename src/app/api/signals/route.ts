import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSignal,
  getSignals,
  updateSignal,
  detectSignals,
  getSignalSummary,
} from "@/lib/signals/service";
import type { SignalType, SignalStatus, ImpactLevel, SignalActionType } from "@/types";

// GET /api/signals - Get signals for the authenticated user
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
    const signalType = searchParams.get("signalType") as SignalType | null;
    const status = searchParams.get("status") as SignalStatus | null;
    const impactLevel = searchParams.get("impactLevel") as ImpactLevel | null;
    const coworkerId = searchParams.get("coworkerId");
    const unresolvedOnly = searchParams.get("unresolvedOnly") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const summary = searchParams.get("summary") === "true";

    if (summary) {
      const summaryData = await getSignalSummary(user.id);
      return NextResponse.json(summaryData);
    }

    const signals = await getSignals(user.id, {
      signalType: signalType || undefined,
      status: status || undefined,
      impactLevel: impactLevel || undefined,
      coworkerId: coworkerId || undefined,
      unresolvedOnly,
      limit,
    });

    return NextResponse.json({ signals });
  } catch (error) {
    console.error("Error fetching signals:", error);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 }
    );
  }
}

// POST /api/signals - Create a new signal or detect signals
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
    const { detect, coworkerId, timeWindow } = body;

    if (detect) {
      // Detect signals from operational data
      const detectedSignals = await detectSignals({
        userId: user.id,
        coworkerId,
        timeWindow,
      });
      return NextResponse.json({ signals: detectedSignals });
    }

    // Create a single signal
    const {
      signalType,
      title,
      description,
      confidence,
      evidence,
      affectedEntities,
      impactLevel,
      estimatedImpact,
      recommendedAction,
      actionType,
    } = body;

    if (!signalType || !title || !description || confidence === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: signalType, title, description, confidence" },
        { status: 400 }
      );
    }

    const signal = await createSignal({
      userId: user.id,
      coworkerId,
      signalType,
      title,
      description,
      confidence,
      evidence: evidence || [],
      affectedEntities: affectedEntities || [],
      impactLevel,
      estimatedImpact,
      recommendedAction,
      actionType,
    });

    return NextResponse.json({ signal }, { status: 201 });
  } catch (error) {
    console.error("Error creating signal:", error);
    return NextResponse.json(
      { error: "Failed to create signal" },
      { status: 500 }
    );
  }
}
