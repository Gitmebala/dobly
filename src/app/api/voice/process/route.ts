import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
    }

    // Simple command parsing - in production this would use NLP/AI
    const lowerTranscript = transcript.toLowerCase();
    
    let action: string | null = null;
    let target: string | null = null;
    let message = "";

    if (lowerTranscript.includes("build") || lowerTranscript.includes("create") || lowerTranscript.includes("new")) {
      action = "build";
      if (lowerTranscript.includes("coworker")) {
        target = "coworker";
        message = "Navigate to Quick Build to create a new coworker";
      }
    } else if (lowerTranscript.includes("status") || lowerTranscript.includes("check")) {
      action = "status";
      target = "coworkers";
      message = "Navigate to Feed to check coworker status";
    } else if (lowerTranscript.includes("health")) {
      action = "health";
      message = "Navigate to a coworker's health view";
    } else if (lowerTranscript.includes("simulation") || lowerTranscript.includes("simulate")) {
      action = "simulate";
      message = "Navigate to Simulate to run a simulation";
    } else if (lowerTranscript.includes("briefing")) {
      action = "briefing";
      message = "Navigate to Dashboard for the latest briefing";
    } else {
      message = "Command not recognized. Try: 'Build a coworker', 'Check status', 'View health', 'Run simulation', or 'Show briefing'";
    }

    // Log the voice command for analytics
    await supabase.from("voice_commands").insert({
      user_id: user.id,
      transcript,
      action,
      target,
      processed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      action,
      target,
      message,
    });
  } catch (error) {
    console.error("Error processing voice command:", error);
    return NextResponse.json(
      { error: "Failed to process voice command" },
      { status: 500 }
    );
  }
}
