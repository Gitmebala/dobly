import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ingestOperatorVoiceTranscript } from "@/lib/operator-chat";

const MAX_VOICE_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid voice submission." }, { status: 400 });

  const transcript = String(form.get("transcript") ?? "").trim();
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript is required. Automatic provider transcription can be added behind this route." },
      { status: 400 },
    );
  }

  const audioFile = form.get("audio");
  if (audioFile instanceof File && audioFile.size > MAX_VOICE_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Voice file is too large." }, { status: 413 });
  }

  try {
    const { id } = await params;
    const result = await ingestOperatorVoiceTranscript({
      userId: user.id,
      operatorId: id,
      transcript,
      providerCallId: String(form.get("providerCallId") ?? "") || null,
      recordingUrl: String(form.get("recordingUrl") ?? "") || null,
      audio: audioFile instanceof File
        ? {
          fileName: audioFile.name,
          contentType: audioFile.type || "audio/webm",
          bytes: await audioFile.arrayBuffer(),
        }
        : null,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not ingest voice transcript.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
