import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type {
  CommunicationChannel,
  CommunicationDraft,
  InboundCommunicationInput,
} from "@/lib/communications/runtime";

export interface VerticalSyncResult {
  skipped?: string;
  customer?: Record<string, unknown>;
  lead?: Record<string, unknown>;
  supportCase?: Record<string, unknown>;
  financeRecord?: Record<string, unknown>;
  operationsItem?: Record<string, unknown>;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.length >= 7 ? digits : null;
}

function extractMoney(text: string) {
  const match = text.match(/(?:kes|ksh|usd|\$)?\s?([\d,]+(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = Number(match[1]?.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency = /\$|usd/i.test(match[0] ?? "") ? "USD" : "KES";
  return { amount, currency };
}

function inferPriority(text: string) {
  if (/(urgent|today|now|angry|legal|lawsuit|fraud|chargeback|emergency)/i.test(text)) return "high";
  if (/(soon|tomorrow|problem|refund|cancel|overdue|blocked|delayed)/i.test(text)) return "medium";
  return "low";
}

function inferLeadValue(text: string) {
  const money = extractMoney(text);
  return money?.amount ?? null;
}

async function upsertCustomer(params: {
  workspaceId: string;
  channel: CommunicationChannel;
  identifier: string;
  name?: string | null;
  body: string;
}) {
  const admin = createAdminSupabaseClient();
  const email = isEmail(params.identifier) ? params.identifier.trim().toLowerCase() : null;
  const phone = email ? null : normalizePhone(params.identifier);
  const { data: existing } = await admin
    .from("customers")
    .select("*")
    .eq("workspace_id", params.workspaceId)
    .limit(200);

  const customer = (existing ?? []).find((row: any) => {
    if (email && String(row.email ?? "").toLowerCase() === email) return true;
    if (phone && normalizePhone(String(row.phone ?? "")) === phone) return true;
    return false;
  });

  const summary = params.body.slice(0, 500);
  if (customer) {
    const { data, error } = await admin
      .from("customers")
      .update({
        full_name: params.name || customer.full_name || params.identifier,
        phone: phone ?? customer.phone ?? null,
        email: email ?? customer.email ?? null,
        channel_preferences: Array.from(new Set([...(customer.channel_preferences ?? []), params.channel])),
        relationship_summary: summary,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer.id)
      .select("*")
      .single();
    if (error || !data) throw new Error(`Failed to update customer: ${error?.message ?? "unknown error"}`);
    return data as Record<string, unknown>;
  }

  const { data, error } = await admin
    .from("customers")
    .insert({
      workspace_id: params.workspaceId,
      full_name: params.name || params.identifier,
      phone,
      email,
      channel_preferences: [params.channel],
      relationship_summary: summary,
      last_seen_at: new Date().toISOString(),
      tags: [params.channel],
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to create customer: ${error?.message ?? "unknown error"}`);
  return data as Record<string, unknown>;
}

async function upsertLead(params: {
  workspaceId: string;
  customerId: string;
  source: string;
  body: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("leads")
    .select("*")
    .eq("workspace_id", params.workspaceId)
    .eq("customer_id", params.customerId)
    .in("status", ["new", "contacted", "qualified", "proposal_sent"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const valueEstimate = inferLeadValue(params.body);
  if (existing) {
    const { data, error } = await admin
      .from("leads")
      .update({
        status: "contacted",
        value_estimate: valueEstimate ?? existing.value_estimate,
        owner_notes: `${String(existing.owner_notes ?? "").trim()}\n${params.body}`.trim().slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) throw new Error(`Failed to update lead: ${error?.message ?? "unknown error"}`);
    return data as Record<string, unknown>;
  }

  const { data, error } = await admin
    .from("leads")
    .insert({
      workspace_id: params.workspaceId,
      customer_id: params.customerId,
      source: params.source,
      status: "new",
      value_estimate: valueEstimate,
      owner_notes: params.body.slice(0, 2000),
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`Failed to create lead: ${error?.message ?? "unknown error"}`);
  return data as Record<string, unknown>;
}

async function createSupportCase(params: {
  workspaceId: string;
  customerId: string;
  channel: CommunicationChannel;
  body: string;
  conversationId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const priority = inferPriority(params.body);
  const { data, error } = await admin
    .from("support_cases")
    .insert({
      workspace_id: params.workspaceId,
      customer_id: params.customerId,
      conversation_id: params.conversationId ?? null,
      source_channel: params.channel,
      status: "open",
      priority,
      title: params.body.slice(0, 120) || "Support request",
      summary: params.body.slice(0, 1200),
      next_action:
        priority === "high"
          ? "Owner review required before sending compensation, refund, or liability language."
          : "Answer from approved memory and ask for missing order/account details.",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`Failed to create support case: ${error?.message ?? "unknown error"}`);
  return data as Record<string, unknown>;
}

async function createFinanceRecord(params: {
  workspaceId: string;
  customerId: string;
  channel: CommunicationChannel;
  body: string;
  conversationId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const money = extractMoney(params.body);
  const recordType = /(paid|receipt|confirmed|sent)/i.test(params.body)
    ? "payment_notice"
    : /(overdue|late|reminder|invoice)/i.test(params.body)
      ? "invoice_followup"
      : "finance_message";
  const { data, error } = await admin
    .from("finance_records")
    .insert({
      workspace_id: params.workspaceId,
      customer_id: params.customerId,
      conversation_id: params.conversationId ?? null,
      source_channel: params.channel,
      record_type: recordType,
      status: "needs_review",
      amount: money?.amount ?? null,
      currency: money?.currency ?? "KES",
      summary: params.body.slice(0, 1200),
      next_action:
        recordType === "payment_notice"
          ? "Match payment reference against open invoices before marking paid."
          : "Review invoice context and queue a respectful follow-up if appropriate.",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`Failed to create finance record: ${error?.message ?? "unknown error"}`);
  return data as Record<string, unknown>;
}

async function createOperationsItem(params: {
  workspaceId: string;
  customerId: string;
  channel: CommunicationChannel;
  body: string;
  conversationId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operations_items")
    .insert({
      workspace_id: params.workspaceId,
      customer_id: params.customerId,
      conversation_id: params.conversationId ?? null,
      source_channel: params.channel,
      status: "open",
      priority: inferPriority(params.body),
      title: params.body.slice(0, 120) || "Operations item",
      summary: params.body.slice(0, 1200),
      next_action: "Identify owner, deadline, dependency, and customer impact.",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`Failed to create operations item: ${error?.message ?? "unknown error"}`);
  return data as Record<string, unknown>;
}

export async function syncVerticalRecordsForCommunication(params: {
  input: InboundCommunicationInput;
  draft: CommunicationDraft;
  conversationId?: string | null;
}): Promise<VerticalSyncResult> {
  if (!params.input.workspaceId) {
    return { skipped: "Vertical records require a workspace_id." };
  }

  const customer = await upsertCustomer({
    workspaceId: params.input.workspaceId,
    channel: params.input.channel,
    identifier: params.input.from,
    name: params.input.customerName,
    body: params.input.body,
  });
  const customerId = String(customer.id);
  const result: VerticalSyncResult = { customer };

  if (params.draft.intent === "lead" || params.draft.intent === "sales_followup") {
    result.lead = await upsertLead({
      workspaceId: params.input.workspaceId,
      customerId,
      source: params.input.channel,
      body: params.input.body,
    });
  }

  if (params.draft.intent === "support") {
    result.supportCase = await createSupportCase({
      workspaceId: params.input.workspaceId,
      customerId,
      channel: params.input.channel,
      body: params.input.body,
      conversationId: params.conversationId,
    });
  }

  if (params.draft.intent === "finance") {
    result.financeRecord = await createFinanceRecord({
      workspaceId: params.input.workspaceId,
      customerId,
      channel: params.input.channel,
      body: params.input.body,
      conversationId: params.conversationId,
    });
  }

  if (/(delivery|delayed|supplier|order|stock|inventory|fulfillment|shipping|blocked)/i.test(params.input.body)) {
    result.operationsItem = await createOperationsItem({
      workspaceId: params.input.workspaceId,
      customerId,
      channel: params.input.channel,
      body: params.input.body,
      conversationId: params.conversationId,
    });
  }

  return result;
}
