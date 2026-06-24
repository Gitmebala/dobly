import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { acceptWorkspaceInvitation } from "@/lib/workspace-invitations";
import { rateLimits } from "@/lib/rate-limit";

const schema = z.object({ token: z.string().min(32).max(200) });

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in with the invited email first." }, { status: 401 });
  if (!rateLimits.write(user.id).allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
  try {
    return NextResponse.json(await acceptWorkspaceInvitation({ token: parsed.data.token, userId: user.id, userEmail: user.email }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not accept invitation." }, { status: 400 });
  }
}
