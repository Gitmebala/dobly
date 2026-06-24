import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Document title is required." }, { status: 400 });
  const { data, error } = await supabase
    .from("workspace_documents")
    .insert({
      user_id: user.id,
      title,
      content: typeof body?.content === "string" ? body.content : "",
      type: typeof body?.type === "string" ? body.type : "note",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not create the document." }, { status: 500 });
  return NextResponse.json({ document: data }, { status: 201 });
}
