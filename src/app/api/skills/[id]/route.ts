import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLearnedSkill, archiveLearnedSkill } from "@/lib/learned-skills";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const skill = await getLearnedSkill({ userId: user.id, skillId: id });
    return NextResponse.json({ skill });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Skill not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    await archiveLearnedSkill({ userId: user.id, skillId: id });
    return NextResponse.json({ archived: true, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove this skill." }, { status: 500 });
  }
}
