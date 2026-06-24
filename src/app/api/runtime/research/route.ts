import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { runResearchRuntime } from "@/lib/runtime/research";
import { rateLimits } from "@/lib/rate-limit";

const schema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  query: z.string().trim().min(5).max(6000),
  mode: z.enum(["answer", "sources", "crawl"]).optional(),
  urls: z.array(z.string().url()).max(6).optional(),
  context: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.generate(user.id).allowed) return NextResponse.json({ error: "Too many research requests." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid research request." }, { status: 400 });
  }
  if (JSON.stringify(parsed.data.context ?? {}).length > 20_000) {
    return NextResponse.json({ error: "Research context is too large." }, { status: 413 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:view" });
  }

  const result = await runResearchRuntime({
    userId: user.id,
    workspaceId: parsed.data.workspaceId ?? null,
    query: parsed.data.query,
    mode: parsed.data.mode ?? "answer",
    urls: parsed.data.urls ?? [],
    context: parsed.data.context ?? {},
  });

  return NextResponse.json(result, { status: result.run.status === "completed" ? 200 : result.run.status === "not_configured" ? 424 : 500 });
}
