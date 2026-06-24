import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/active-workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ userId: null });
    }

    const [{ data: profile }, workspaceContext] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
      resolveActiveWorkspace(user.id),
    ]);

    return NextResponse.json({
      userId: user.id,
      plan: profile?.plan ?? null,
      workspaceId: workspaceContext.activeWorkspace?.id ?? null,
    });
  } catch {
    return NextResponse.json({ userId: null });
  }
}
