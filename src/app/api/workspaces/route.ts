import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listAccessibleWorkspaces, upsertWorkspaceMember } from "@/lib/workspaces";
import { captureServerEvent } from "@/lib/telemetry/server";

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  region: z.string().max(40).optional().nullable(),
  timezone: z.string().min(2).max(120).optional(),
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await listAccessibleWorkspaces(user.id);
  return NextResponse.json({ workspaces });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = createWorkspaceSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.errors[0]?.message ?? "Invalid workspace." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_user_id: user.id,
      name: validation.data.name,
      slug: validation.data.slug,
      region: validation.data.region ?? "KE",
      timezone: validation.data.timezone ?? "Africa/Nairobi",
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create workspace." }, { status: 500 });
  }

  await upsertWorkspaceMember({
    workspaceId: String((data as any).id),
    userId: user.id,
    role: "owner",
  }).catch(() => undefined);

  await captureServerEvent({
    event: "workspace_created",
    distinctId: user.id,
    properties: { workspace_id: String((data as any).id), region: validation.data.region ?? "KE" },
  });

  return NextResponse.json({ workspace: data }, { status: 201 });
}
