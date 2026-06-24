import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DeepgramStreamHandler, getDeepgramConfig } from "@/lib/voice/deepgram";
import { rateLimits } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/api-security";
import { validateUpload } from "@/lib/security/uploads";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

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
    if (!rateLimits.generate(user.id || getRequestIp(req)).allowed) {
      return NextResponse.json({ error: "Too many transcription requests. Please wait and try again." }, { status: 429 });
    }

    const config = getDeepgramConfig();
    if (!config) {
      return NextResponse.json({ error: "Speech transcription is not configured" }, { status: 503 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!(audioFile instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    validateUpload(audioFile, { maxBytes: MAX_AUDIO_BYTES, kind: "audio" });

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const deepgram = new DeepgramStreamHandler(config);
    const transcript = await deepgram.transcribeFile(audioBuffer);

    return NextResponse.json({
      success: true,
      transcript: transcript.trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to transcribe audio";
    console.error("Error transcribing voice command:", error);
    return NextResponse.json({ error: /limit|audio|empty/i.test(message) ? message : "Failed to transcribe audio" }, { status: /limit|audio|empty/i.test(message) ? 400 : 500 });
  }
}
