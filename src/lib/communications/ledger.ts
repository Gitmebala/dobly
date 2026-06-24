import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { CommunicationChannel, CommunicationIntent } from "@/lib/communications/runtime";
import type { OfficeDepartmentId, OfficeRiskLevel } from "@/lib/office/types";

export interface CommunicationConversationRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  channel: CommunicationChannel;
  external_thread_id: string;
  contact_identifier: string;
  contact_name: string | null;
  department_id: OfficeDepartmentId;
  intent: CommunicationIntent;
  risk_level: OfficeRiskLevel;
  status: "open" | "waiting_customer" | "waiting_owner" | "closed";
  summary: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationMessageInput {
  conversationId: string;
  userId: string;
  workspaceId?: string | null;
  channel: CommunicationChannel;
  direction: "inbound" | "outbound";
  sender: "customer" | "dobly" | "owner" | "system";
  from: string;
  to?: string | null;
  body: string;
  status: "received" | "drafted" | "waiting_approval" | "queued" | "sent" | "failed";
  providerMessageId?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
}

export function buildExternalThreadId(params: {
  channel: CommunicationChannel;
  from: string;
  to?: string | null;
  providerMessageId?: string | null;
}) {
  const left = params.channel === "website_chat" ? params.from : [params.from, params.to ?? ""].sort().join(":");
  return `${params.channel}:${left || params.providerMessageId || "unknown"}`.slice(0, 240);
}

export async function upsertCommunicationConversation(params: {
  userId: string;
  workspaceId?: string | null;
  channel: CommunicationChannel;
  externalThreadId: string;
  contactIdentifier: string;
  contactName?: string | null;
  departmentId: OfficeDepartmentId;
  intent: CommunicationIntent;
  riskLevel: OfficeRiskLevel;
  summary: string;
}) {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("communication_conversations")
    .upsert(
      {
        user_id: params.userId,
        workspace_id: params.workspaceId ?? null,
        channel: params.channel,
        external_thread_id: params.externalThreadId,
        contact_identifier: params.contactIdentifier,
        contact_name: params.contactName ?? null,
        department_id: params.departmentId,
        intent: params.intent,
        risk_level: params.riskLevel,
        status: params.riskLevel === "low" ? "open" : "waiting_owner",
        summary: params.summary,
        last_message_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,channel,external_thread_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert communication conversation: ${error?.message ?? "unknown error"}`);
  }

  return data as CommunicationConversationRecord;
}

export async function recordCommunicationMessage(input: CommunicationMessageInput) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("communication_messages")
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      channel: input.channel,
      direction: input.direction,
      sender: input.sender,
      from_identifier: input.from,
      to_identifier: input.to ?? null,
      body: input.body,
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      office_task_id: input.taskId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to record communication message: ${error?.message ?? "unknown error"}`);
  }

  return data as Record<string, unknown>;
}

export async function markCommunicationTaskMessages(params: {
  userId: string;
  taskId: string;
  status: "queued" | "sent" | "failed";
  providerMessageId?: string | null;
  summary?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("communication_messages")
    .update({
      status: params.status,
      provider_message_id: params.providerMessageId ?? undefined,
      metadata: {
        delivery_summary: params.summary ?? null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId)
    .eq("office_task_id", params.taskId);

  if (error) {
    throw new Error(`Failed to update communication message status: ${error.message}`);
  }
}

export async function markCommunicationMessagesByProvider(params: {
  providerMessageId: string;
  status?: "sent" | "failed";
  summary?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const providerMessageId = params.providerMessageId.trim();
  if (!providerMessageId) return;

  const { data: existing, error: readError } = await admin
    .from("communication_messages")
    .select("id, metadata")
    .eq("provider_message_id", providerMessageId);

  if (readError) {
    throw new Error(`Failed to load communication messages for provider status update: ${readError.message}`);
  }

  for (const row of existing ?? []) {
    const mergedMetadata = {
      ...(((row as any).metadata ?? {}) as Record<string, unknown>),
      ...(params.metadata ?? {}),
      ...(params.summary ? { delivery_summary: params.summary } : {}),
    };

    const updatePayload: Record<string, unknown> = {
      metadata: mergedMetadata,
      updated_at: new Date().toISOString(),
    };

    if (params.status) {
      updatePayload.status = params.status;
    }

    const { error } = await admin
      .from("communication_messages")
      .update(updatePayload)
      .eq("id", String((row as any).id));

    if (error) {
      throw new Error(`Failed to update communication message by provider id: ${error.message}`);
    }
  }
}
