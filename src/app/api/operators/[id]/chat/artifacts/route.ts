import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { attachFileToOperatorChat } from "@/lib/operator-chat";

const MAX_CHAT_UPLOAD_BYTES = 80 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }
  if (file.size > MAX_CHAT_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large for chat upload." }, { status: 413 });
  }

  const workspaceIdRaw = form.get("workspaceId");
  const workspaceId = typeof workspaceIdRaw === "string" && workspaceIdRaw ? workspaceIdRaw : null;
  const titleRaw = form.get("title");
  const noteRaw = form.get("note");

  try {
    const { id } = await params;
    const result = await attachFileToOperatorChat({
      userId: user.id,
      operatorId: id,
      workspaceId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      bytes: await file.arrayBuffer(),
      title: typeof titleRaw === "string" && titleRaw ? titleRaw : file.name,
      note: typeof noteRaw === "string" ? noteRaw : undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not attach file to Operator chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
