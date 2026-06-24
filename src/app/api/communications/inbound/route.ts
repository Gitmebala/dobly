import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestInboundCommunication } from "@/lib/communications/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import type { ApiError } from "@/types";

const inboundCommunicationSchema = z.object({
  workspaceId: z.string().uuid().optional().nullable(),
  channel: z.enum(["sms", "whatsapp", "email", "website_chat", "voice"]),
  from: z.string().min(1).max(180),
  to: z.string().max(180).optional().nullable(),
  body: z.string().min(1).max(8000),
  customerName: z.string().max(160).optional().nullable(),
  providerMessageId: z.string().max(220).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = inboundCommunicationSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid communication event." },
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

  const result = await ingestInboundCommunication({
    userId: user.id,
    workspaceId: validation.data.workspaceId ?? null,
    channel: validation.data.channel,
    from: validation.data.from,
    to: validation.data.to,
    body: validation.data.body,
    customerName: validation.data.customerName,
    providerMessageId: validation.data.providerMessageId,
    metadata: validation.data.metadata,
  });

  return NextResponse.json({
    draft: result.draft,
    event: result.event,
    tasks: result.tasks,
    intents: result.intents,
    nextStep:
      result.draft.requiresApproval
        ? "Review the proposed response in Approvals."
        : "Dobly queued the response path for execution.",
  });
}
