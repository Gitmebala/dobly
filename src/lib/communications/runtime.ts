import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { ingestAndDispatchOfficeEvent } from "@/lib/office/runtime";
import { recordOfficeEvent } from "@/lib/office/events";
import { checkUsageEntitlement, recordUsageEvent } from "@/lib/billing/entitlements";
import { sendConnectedEmail } from "@/lib/providers/email";
import { sendMetaWhatsAppText } from "@/lib/providers/meta-whatsapp";
import { chooseSmsProvider, sendDoblySms } from "@/lib/providers/dobly-comms";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import {
  buildExternalThreadId,
  markCommunicationTaskMessages,
  recordCommunicationMessage,
  upsertCommunicationConversation,
} from "@/lib/communications/ledger";
import { syncVerticalRecordsForCommunication } from "@/lib/vertical-records";
import type { BusinessMemoryItem, BusinessMemoryScope } from "@/lib/business-memory";
import type { OfficeDepartmentId, OfficeRiskLevel } from "@/lib/office/types";

export type CommunicationChannel = "sms" | "whatsapp" | "email" | "website_chat" | "voice";
export type CommunicationIntent = "lead" | "support" | "sales_followup" | "finance" | "general";

export interface InboundCommunicationInput {
  userId: string;
  workspaceId?: string | null;
  channel: CommunicationChannel;
  from: string;
  to?: string | null;
  body: string;
  customerName?: string | null;
  providerMessageId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CommunicationDraft {
  intent: CommunicationIntent;
  departmentScope: BusinessMemoryScope;
  riskLevel: OfficeRiskLevel;
  suggestedReply: string;
  summary: string;
  memoryUsed: Array<Pick<BusinessMemoryItem, "id" | "kind" | "scope" | "title">>;
  requiresApproval: boolean;
}

function inferCommunicationIntent(text: string): CommunicationIntent {
  const lower = text.toLowerCase();
  if (/(refund|angry|complaint|broken|not working|support|issue|problem|cancel)/.test(lower)) return "support";
  if (/(invoice|payment|paid|receipt|mpesa|m-pesa|stripe|money|overdue)/.test(lower)) return "finance";
  if (/(price|quote|book|appointment|available|interested|need|want|service|buy)/.test(lower)) return "lead";
  if (/(follow up|proposal|deal|call me|callback)/.test(lower)) return "sales_followup";
  return "general";
}

function scopeForIntent(intent: CommunicationIntent): BusinessMemoryScope {
  if (intent === "support") return "support";
  if (intent === "finance") return "finance";
  if (intent === "lead" || intent === "sales_followup") return "sales";
  return "reception";
}

function inferRiskLevel(text: string, intent: CommunicationIntent): OfficeRiskLevel {
  const lower = text.toLowerCase();
  if (/(lawsuit|legal|police|fraud|chargeback|medical emergency|threat)/.test(lower)) return "high";
  if (/(refund|cancel|angry|complaint|discount|payment|invoice|overdue|private|confidential)/.test(lower)) return "medium";
  if (intent === "finance" || intent === "support") return "medium";
  return "low";
}

function summarizeMessage(input: InboundCommunicationInput, intent: CommunicationIntent) {
  const customer = input.customerName || input.from;
  return `${customer} sent a ${input.channel.replace("_", " ")} message classified as ${intent}: ${input.body.slice(0, 220)}`;
}

function buildSuggestedReply(params: {
  input: InboundCommunicationInput;
  intent: CommunicationIntent;
  memories: BusinessMemoryItem[];
  riskLevel: OfficeRiskLevel;
}) {
  const businessTone =
    params.memories.find((item) => item.kind === "tone")?.body ??
    "Friendly, concise, helpful, and clear.";
  const usefulMemory = params.memories
    .filter((item) => ["faq", "service", "product", "policy", "sales_rule", "support_rule", "finance_rule"].includes(item.kind))
    .slice(0, 3)
    .map((item) => `${item.title}: ${item.body}`)
    .join("\n");

  if (params.riskLevel === "high") {
    return "Thanks for reaching out. I’m going to have a person review this carefully and get back to you with the right next step.";
  }

  if (params.intent === "lead") {
    return `Thanks for reaching out. We can help with that. Could you share the best time to contact you and any key details about what you need?`;
  }

  if (params.intent === "support") {
    return `Thanks for letting us know. I’m sorry about the trouble. Could you share any order, booking, or account details so we can check this properly?`;
  }

  if (params.intent === "finance") {
    return `Thanks for the update. We’ll check the payment or invoice details and follow up with the correct status.`;
  }

  if (params.intent === "sales_followup") {
    return `Thanks for following up. We’ll review the details and get back to you with the next step shortly.`;
  }

  return usefulMemory
    ? `Thanks for your message. Based on our current information: ${usefulMemory.split("\n")[0]}. How can we help you further?`
    : `Thanks for your message. We’ll help you with this shortly.`;
}

async function loadRelevantMemory(params: {
  userId: string;
  workspaceId?: string | null;
  scope: BusinessMemoryScope;
  body: string;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("business_memory_items")
    .select("*")
    .eq("user_id", params.userId)
    .in("scope", ["global", params.scope])
    .order("updated_at", { ascending: false })
    .limit(8);

  if (params.workspaceId) query = query.eq("workspace_id", params.workspaceId);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as BusinessMemoryItem[];
}

export async function buildCommunicationDraft(input: InboundCommunicationInput): Promise<CommunicationDraft> {
  const intent = inferCommunicationIntent(input.body);
  const departmentScope = scopeForIntent(intent);
  const riskLevel = inferRiskLevel(input.body, intent);
  const memories = await loadRelevantMemory({
    userId: input.userId,
    workspaceId: input.workspaceId,
    scope: departmentScope,
    body: input.body,
  });

  const requiresApproval = riskLevel !== "low" || input.channel === "email";
  const suggestedReply = buildSuggestedReply({
    input,
    intent,
    memories,
    riskLevel,
  });

  return {
    intent,
    departmentScope,
    riskLevel,
    suggestedReply,
    summary: summarizeMessage(input, intent),
    memoryUsed: memories.map((item) => ({
      id: item.id,
      kind: item.kind,
      scope: item.scope,
      title: item.title,
    })),
    requiresApproval,
  };
}

export async function ingestInboundCommunication(input: InboundCommunicationInput) {
  const metric =
    input.channel === "sms"
      ? "sms_messages"
      : input.channel === "whatsapp"
      ? "whatsapp_conversations"
      : input.channel === "website_chat"
      ? "chatbot_conversations"
      : input.channel === "voice"
      ? "voice_minutes"
      : "ai_actions";
  const allowed = await checkUsageEntitlement({
    userId: input.userId,
    workspaceId: input.workspaceId,
    metric,
  });
  if (!allowed.allowed) {
    throw new Error(allowed.reason ?? "Usage limit reached for this plan.");
  }

  const draft = await buildCommunicationDraft(input);
  const departmentId = departmentForScope(draft.departmentScope);
  const externalThreadId =
    typeof input.metadata?.externalThreadId === "string"
      ? input.metadata.externalThreadId
      : buildExternalThreadId({
          channel: input.channel,
          from: input.from,
          to: input.to ?? null,
          providerMessageId: input.providerMessageId ?? null,
        });
  const conversation = await upsertCommunicationConversation({
    userId: input.userId,
    workspaceId: input.workspaceId,
    channel: input.channel,
    externalThreadId,
    contactIdentifier: input.from,
    contactName: input.customerName ?? null,
    departmentId,
    intent: draft.intent,
    riskLevel: draft.riskLevel,
    summary: draft.summary,
  });
  const inboundMessage = await recordCommunicationMessage({
    conversationId: conversation.id,
    userId: input.userId,
    workspaceId: input.workspaceId,
    channel: input.channel,
    direction: "inbound",
    sender: "customer",
    from: input.from,
    to: input.to ?? null,
    body: input.body,
    status: "received",
    providerMessageId: input.providerMessageId ?? null,
    metadata: {
      customerName: input.customerName ?? null,
      intent: draft.intent,
      riskLevel: draft.riskLevel,
      memoryUsed: draft.memoryUsed,
      ...(input.metadata ?? {}),
    },
  });
  const verticalRecords = await syncVerticalRecordsForCommunication({
    input,
    draft,
    conversationId: conversation.id,
  });
  const dispatch = await ingestAndDispatchOfficeEvent({
    workspaceId: input.workspaceId ?? null,
    userId: input.userId,
    eventType: draft.intent === "support" ? "support.ticket_created" : draft.intent === "lead" ? "lead.created" : "message.received",
    source: `communication.${input.channel}`,
    title: `${input.channel.replace("_", " ")} message from ${input.customerName || input.from}`,
    summary: draft.summary,
    payload: {
      channel: input.channel,
      from: input.from,
      to: input.to ?? null,
      body: input.body,
      customerName: input.customerName ?? null,
      providerMessageId: input.providerMessageId ?? null,
      metadata: input.metadata ?? {},
      conversationId: conversation.id,
      communicationMessageId: inboundMessage.id,
      externalThreadId,
      verticalRecords,
      draft,
    },
    riskLevel: draft.riskLevel,
  });

  const replyTask = await createCommunicationReplyTask({
    input,
    draft,
    conversationId: conversation.id,
    sourceEventId: dispatch.event.id,
  });

  await recordUsageEvent({
    userId: input.userId,
    workspaceId: input.workspaceId,
    metric,
    source: `communication.${input.channel}.inbound`,
    metadata: { intent: draft.intent, riskLevel: draft.riskLevel },
  });

  return { draft, conversation, inboundMessage, verticalRecords, replyTask, ...dispatch };
}

function departmentForScope(scope: BusinessMemoryScope): OfficeDepartmentId {
  if (scope === "sales") return "sales";
  if (scope === "support") return "support";
  if (scope === "finance") return "finance";
  if (scope === "marketing") return "marketing";
  if (scope === "operations") return "operations";
  if (scope === "general_manager") return "general_manager";
  if (scope === "boardroom") return "boardroom";
  return "reception";
}

async function createCommunicationReplyTask(params: {
  input: InboundCommunicationInput;
  draft: CommunicationDraft;
  conversationId: string;
  sourceEventId: string;
}) {
  const admin = createAdminSupabaseClient();
  const status = params.draft.requiresApproval ? "waiting_approval" : "queued";
  const departmentId = departmentForScope(params.draft.departmentScope);

  const { data, error } = await admin
    .from("office_tasks")
    .insert({
      workspace_id: params.input.workspaceId ?? null,
      user_id: params.input.userId,
      source_event_id: params.sourceEventId,
      department_id: departmentId,
      worker_key: `${departmentId}_communication_reply`,
      runtime_kind: "automation",
      title: `Reply to ${params.input.customerName || params.input.from}`,
      summary: params.draft.suggestedReply,
      risk_level: params.draft.riskLevel,
      status,
      approval_required: params.draft.requiresApproval,
      tool_name: "communication_reply",
      tool_payload: {
        channel: params.input.channel,
        to: params.input.from,
        from: params.input.to ?? null,
        body: params.draft.suggestedReply,
        conversationId: params.conversationId,
        memoryUsed: params.draft.memoryUsed,
        inbound: {
          from: params.input.from,
          to: params.input.to ?? null,
          body: params.input.body,
          customerName: params.input.customerName ?? null,
        },
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create communication reply task: ${error?.message ?? "unknown error"}`);
  }

  await recordCommunicationMessage({
    conversationId: params.conversationId,
    userId: params.input.userId,
    workspaceId: params.input.workspaceId,
    channel: params.input.channel,
    direction: "outbound",
    sender: "dobly",
    from: params.input.to ?? "dobly",
    to: params.input.from,
    body: params.draft.suggestedReply,
    status: params.draft.requiresApproval ? "waiting_approval" : "queued",
    taskId: String((data as any).id),
    metadata: {
      draft: params.draft,
      sourceEventId: params.sourceEventId,
    },
  });

  await recordOfficeEvent({
    workspaceId: params.input.workspaceId ?? null,
    userId: params.input.userId,
    departmentId,
    workerKind: "automation",
    eventType: "worker.action_proposed",
    source: "communication.runtime",
    entityType: "office_task",
    entityId: String((data as any).id),
    title: `Reply prepared for ${params.input.customerName || params.input.from}`,
    summary: params.draft.requiresApproval
      ? "Dobly drafted a reply and is waiting for owner approval."
      : "Dobly drafted a low-risk reply and queued it for execution.",
    payload: {
      task: data,
      draft: params.draft,
    },
    riskLevel: params.draft.riskLevel,
  });

  return data as Record<string, unknown>;
}

export async function sendCommunicationReply(params: {
  userId: string;
  taskId: string;
  channel: CommunicationChannel;
  to: string;
  body: string;
  from?: string | null;
}) {
  const billable = params.channel === "sms" || params.channel === "whatsapp" || params.channel === "email";
  const smsProvider = params.channel === "sms" ? chooseSmsProvider(params.to) : null;
  const estimate = params.channel === "sms"
    ? { capability: "sms.send" as const, provider: smsProvider ?? "kenya_local", estimatedMinor: smsProvider === "twilio" ? 1_500 : smsProvider === "africas_talking" ? 200 : 150, paidRail: true }
    : params.channel === "whatsapp"
      ? { capability: "whatsapp.send" as const, provider: "meta", estimatedMinor: 300, paidRail: true }
      : { capability: "email.send" as const, provider: "resend", estimatedMinor: 10, paidRail: true };
  const reservation = billable
    ? await reserveOperatingCapacity({
        userId: params.userId,
        capability: estimate.capability,
        provider: estimate.provider,
        estimatedMinor: estimate.estimatedMinor,
        idempotencyKey: `communication:${params.taskId}:${params.channel}`,
        metadata: { taskId: params.taskId, channel: params.channel },
      })
    : null;
  try {
    if (params.channel === "sms") {
      const message = await sendDoblySms({
        to: params.to,
        from: params.from ?? undefined,
        body: params.body,
      });
      const summary = `SMS sent to ${params.to}.`;
      await markCommunicationTaskMessages({
        userId: params.userId,
        taskId: params.taskId,
        status: "sent",
        providerMessageId: message.providerMessageId,
        summary,
      }).catch(() => undefined);
      await settleOperatingCapacity({
        reservationId: reservation!.id,
        actualMinor: estimate.estimatedMinor,
        status: "succeeded",
        providerRequestId: message.providerMessageId,
        metadata: { taskId: params.taskId, channel: params.channel, provider: message.provider },
      });

      return {
        status: "completed" as const,
        provider: message.provider,
        providerMessageId: message.providerMessageId,
        summary,
        message,
      };
    }

    if (params.channel === "whatsapp") {
      const message = await sendMetaWhatsAppText({
        userId: params.userId,
        to: params.to,
        body: params.body,
        phoneNumberId: params.from ?? undefined,
      });
      const providerMessageId = message.messages?.[0]?.id ?? null;
      const summary = `WhatsApp message sent to ${params.to}.`;
      await markCommunicationTaskMessages({
        userId: params.userId,
        taskId: params.taskId,
        status: "sent",
        providerMessageId,
        summary,
      }).catch(() => undefined);
      await settleOperatingCapacity({
        reservationId: reservation!.id,
        actualMinor: estimate.estimatedMinor,
        status: "succeeded",
        providerRequestId: providerMessageId,
        metadata: { taskId: params.taskId, channel: params.channel, provider: "meta" },
      });

      return {
        status: "completed" as const,
        provider: "meta_whatsapp",
        providerMessageId,
        summary,
        message,
      };
    }

    if (params.channel === "email") {
      const message = await sendConnectedEmail({
        userId: params.userId,
        to: params.to,
        from: params.from ?? undefined,
        subject: "Re: Your message",
        body: params.body,
      });
      await markCommunicationTaskMessages({
        userId: params.userId,
        taskId: params.taskId,
        status: "sent",
        providerMessageId: message.id,
        summary: message.summary,
      }).catch(() => undefined);
      await settleOperatingCapacity({
        reservationId: reservation!.id,
        actualMinor: message.provider === "resend" ? estimate.estimatedMinor : 0,
        status: "succeeded",
        providerRequestId: message.id,
        metadata: { taskId: params.taskId, channel: params.channel, provider: message.provider },
      });

      return {
        status: "completed" as const,
        provider: message.provider,
        providerMessageId: message.id,
        summary: message.summary,
        message,
      };
    }

    return {
      status: "needs_connection" as const,
      provider: params.channel,
      summary: `${params.channel.replace("_", " ")} sending is not connected to a live provider yet.`,
    };
  } catch (error) {
    const summary = error instanceof Error ? error.message : "Communication send failed.";
    if (reservation) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: failedProviderCharge({ paidRail: estimate.paidRail, estimatedMinor: estimate.estimatedMinor, errorMessage: summary }),
        status: "failed",
        metadata: { taskId: params.taskId, channel: params.channel, error: summary },
      }).catch(() => undefined);
    }
    await markCommunicationTaskMessages({
      userId: params.userId,
      taskId: params.taskId,
      status: "failed",
      summary,
    }).catch(() => undefined);
    throw error;
  }
}
