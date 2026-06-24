import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { createDoblyOperator, listDoblyOperators } from "@/lib/dobly-operators";
import { DOBLY_CAPABILITIES, type DoblyCapability } from "@/lib/runtime/capabilities";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";

const capabilityIds = DOBLY_CAPABILITIES.map((capability) => capability.id) as [string, ...string[]];

const createOperatorSchema = z.object({
  workspaceId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  mission: z.string().trim().min(8).max(3000),
  outcome: z.string().trim().max(1000).optional(),
  scope: z.string().trim().max(1600).optional(),
  kind: z.enum(["business", "work", "life", "custom"]).optional(),
  approvalMode: z.enum(["ask_first", "approve_risky", "supervised", "trusted"]).optional(),
  capabilityTags: z.array(z.enum(capabilityIds)).max(20).optional(),
  connectedToolIds: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
  guardrails: z.record(z.unknown()).optional(),
  memoryPolicy: z.record(z.unknown()).optional(),
  qualitySelections: z.record(z.string().trim().min(1).max(160)).optional(),
  qualityCustomizations: z.record(z.string().trim().min(1).max(1000)).optional(),
  loops: z.array(z.object({
    name: z.string().trim().min(2).max(140).optional(),
    cadence: z.enum(["manual", "always_on", "hourly", "daily", "weekly", "market_open", "event_based"]).optional(),
    trigger: z.string().trim().max(1000).optional(),
    playbook: z.string().trim().max(3000).optional(),
  })).max(12).optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");
  if (workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId, permission: "office:view" });
  }

  const operators = await listDoblyOperators({
    userId: user.id,
    workspaceId,
    includeArchived: url.searchParams.get("includeArchived") === "true",
  });
  return NextResponse.json({ operators });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createOperatorSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid Operator." }, { status: 400 });
  }

  if (parsed.data.workspaceId) {
    await requireWorkspacePermission({ userId: user.id, workspaceId: parsed.data.workspaceId, permission: "office:write" });
  }

  const operator = await createDoblyOperator({
    userId: user.id,
    ...parsed.data,
    capabilityTags: parsed.data.capabilityTags as DoblyCapability[] | undefined,
  });
  const conversation = await ensureOperatorConversation({
    userId: user.id,
    operatorId: operator.id,
    workspaceId: operator.workspace_id,
    title: `${operator.name} Chat`,
  });
  await appendOperatorChatMessage({
    conversationId: conversation.id,
    userId: user.id,
    workspaceId: operator.workspace_id,
    operatorId: operator.id,
    role: "system",
    intent: "system",
    body: [
      `${operator.name} is ready.`,
      "This chat is its permanent work journal: instructions, plans, approvals, artifacts, memory updates, failures, and completed work will be written here.",
    ].join(" "),
    metadata: {
      source: "operator_create",
      operatorId: operator.id,
      coworkerOperatingProfile: operator.guardrails?.coworkerOperatingProfile ?? operator.memory_policy?.coworkerOperatingProfile ?? null,
    },
  }).catch(() => undefined);
  await recordOperatorChatEvent({
    conversationId: conversation.id,
    userId: user.id,
    workspaceId: operator.workspace_id,
    operatorId: operator.id,
    eventType: "operator_created",
    title: "Coworker created",
    summary: `${operator.name} was created with memory, loops, approvals, and a persistent chat journal.`,
    severity: "success",
    payload: {
      capabilityTags: operator.capability_tags,
      loops: operator.loops,
      approvalMode: operator.approval_mode,
    },
  }).catch(() => undefined);
  return NextResponse.json({ operator }, { status: 201 });
}
