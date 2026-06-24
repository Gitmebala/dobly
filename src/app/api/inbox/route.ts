import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Write something to capture." }, { status: 400 });
  const detectedType = typeof body?.detectedType === "string" ? body.detectedType : "note";
  const { data, error } = await supabase
    .from("workspace_inbox")
    .insert({ user_id: user.id, content, detected_type: detectedType, status: "unsorted", source: "manual" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not capture the item." }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const destination = typeof body?.destination === "string" ? body.destination : "archive";
  const { data: item } = await supabase.from("workspace_inbox").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!item) return NextResponse.json({ error: "Inbox item not found." }, { status: 404 });

  if (destination === "task") {
    await supabase.from("workspace_tasks").insert({
      user_id: user.id,
      title: item.content,
      description: "Captured from Inbox",
      priority: "medium",
      status: "open",
    });
  }
  if (destination === "document") {
    await supabase.from("workspace_documents").insert({
      user_id: user.id,
      title: item.content.slice(0, 80),
      content: item.content,
      type: "note",
    });
  }
  const { data, error } = await supabase
    .from("workspace_inbox")
    .update({ status: "organized", destination })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Could not organize the item." }, { status: 500 });
  return NextResponse.json({ item: data });
}
