import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listOfficeEvents } from "@/lib/office/events";
import { ingestAndDispatchOfficeEvent } from "@/lib/office/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import type { ApiError } from "@/types";

const eventSchema = z.object({
  workspaceId: z.string().uuid().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  workerId: z.string().optional().nullable(),
  workerKind: z.enum(["automation", "bot", "agent", "system"]).optional(),
  eventType: z.string(),
  source: z.string().min(1).max(120),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
  title: z.string().min(1).max(240),
  summary: z.string().max(1000).optional().nullable(),
  payload: z.record(z.unknown()).optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  occurredAt: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (workspaceId) {
    try {
      await requireWorkspacePermission({
        userId: user.id,
        workspaceId,
        permission: "office:view",
      });
    } catch (error) {
      return NextResponse.json<ApiError>(
        { error: error instanceof Error ? error.message : "You do not have access to this workspace." },
        { status: 403 },
      );
    }
  }
  const limit = Number(searchParams.get("limit") ?? 50);
  const departmentId = searchParams.get("departmentId");
  const workerId = searchParams.get("workerId");
  const events = await listOfficeEvents({
    userId: user.id,
    workspaceId: workspaceId || null,
    departmentId: departmentId || null,
    workerId: workerId || null,
    limit,
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = eventSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid office event." },
      { status: 400 },
    );
  }

  if (validation.data.workspaceId) {
    try {
      await requireWorkspacePermission({
        userId: user.id,
        workspaceId: validation.data.workspaceId,
        permission: "office:write",
      });
    } catch (error) {
      return NextResponse.json<ApiError>(
        { error: error instanceof Error ? error.message : "You do not have access to this workspace." },
        { status: 403 },
      );
    }
  }

  const dispatch = await ingestAndDispatchOfficeEvent({
    ...validation.data,
    userId: user.id,
    departmentId: validation.data.departmentId as any,
    eventType: validation.data.eventType as any,
  });

  return NextResponse.json(dispatch, { status: 201 });
}
