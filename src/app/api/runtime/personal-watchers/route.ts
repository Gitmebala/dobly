import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import {
  createPersonalWatcher,
  listPersonalWatchers,
} from "@/lib/runtime/personal-watchers";

const watcherStatusSchema = z.enum(["active", "paused", "archived"]).optional();
const createSchema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  category: z.enum(["markets", "travel", "health", "calendar", "subscriptions", "bills", "news", "custom"]),
  strategy: z.string().trim().min(10).max(6000),
  cadence: z.string().trim().min(2).max(80).optional(),
  dataSources: z.array(z.string().min(1).max(200)).max(20).optional(),
  triggerRules: z.record(z.unknown()).optional(),
  notificationChannels: z.array(z.string().min(1).max(80)).max(10).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const status = watcherStatusSchema.safeParse(url.searchParams.get("status") ?? undefined);

  if (!status.success) {
    return NextResponse.json({ error: "Invalid watcher status." }, { status: 400 });
  }

  if (workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId, permission: "office:view" });
  }

  try {
    const watchers = await listPersonalWatchers({
      userId: user.id,
      workspaceId,
      status: status.data,
    });
    return NextResponse.json({ watchers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load personal watchers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid watcher request." }, { status: 400 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:write" });
  }

  try {
    const watcher = await createPersonalWatcher({
      userId: user.id,
      workspaceId: parsed.data.workspaceId ?? null,
      name: parsed.data.name,
      category: parsed.data.category,
      strategy: parsed.data.strategy,
      cadence: parsed.data.cadence,
      dataSources: parsed.data.dataSources,
      triggerRules: parsed.data.triggerRules,
      notificationChannels: parsed.data.notificationChannels,
    });
    return NextResponse.json({ watcher }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create personal watcher.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
