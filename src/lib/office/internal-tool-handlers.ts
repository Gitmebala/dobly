import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createConversationReply } from "@/lib/anthropic";
import { getActiveConnectionForProvider, getDecryptedConnectionSecrets } from "@/lib/connections";
import { createHostedInvoicePaymentLink } from "@/lib/intasend";
import type { OfficeToolExecutionInput, OfficeToolExecutionResult } from "@/lib/office/tool-executor";

/**
 * Real implementations for the "internal tools" an office worker can call
 * without an external connection. Each handler grounds its output in the
 * task's actual payload and, where useful, real rows from Supabase — never
 * a canned string or Math.random().
 */

async function askJson<T>(params: { system: string; prompt: string; maxTokens?: number }): Promise<T> {
  const text = await createConversationReply({
    system: `${params.system}\n\nRespond with ONLY valid JSON. No markdown, no prose, no code fences.`,
    messages: [{ role: "user", content: params.prompt }],
    maxTokens: params.maxTokens ?? 400,
  });
  return JSON.parse(text) as T;
}

function payloadText(payload: Record<string, unknown>) {
  const direct = [
    payload.body,
    payload.message,
    payload.summary,
    payload.title,
    (payload as Record<string, any>)?.inbound?.body,
    (payload as Record<string, any>)?.payload?.body,
  ].find((value) => typeof value === "string" && value.trim().length > 0);
  return String(direct ?? JSON.stringify(payload)).slice(0, 2000);
}

async function handleMessageClassifier(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const text = payloadText(input.toolPayload);
  const result = await askJson<{ intent: string; urgency: "low" | "medium" | "high"; sentiment: "positive" | "neutral" | "negative"; summary: string }>({
    system: "Classify an inbound business message. intent is a short label (question, complaint, booking_request, purchase_intent, spam, other). urgency and sentiment as specified. summary is one sentence.",
    prompt: `Message:\n${text}`,
  });
  return {
    status: "completed",
    summary: `Classified as ${result.intent} (${result.urgency} urgency, ${result.sentiment} sentiment).`,
    output: result,
  };
}

async function handleLeadQualifier(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const text = payloadText(input.toolPayload);
  const result = await askJson<{ score: number; fit: "hot" | "warm" | "cold"; missing_info: string[]; next_step: string; reasoning: string }>({
    system: "Score an inbound lead from 0-100 on purchase intent, urgency, and fit. fit is hot (score>=70), warm (40-69), or cold (<40). List concrete missing_info fields (budget, timeline, decision-maker, etc.) still needed to qualify. next_step is one concrete action.",
    prompt: `Lead message / context:\n${text}`,
  });
  return {
    status: "completed",
    summary: `Lead scored ${result.score}/100 (${result.fit}). Next step: ${result.next_step}`,
    output: result,
  };
}

async function handleCalendarCheck(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const admin = createAdminSupabaseClient();
  const requestedAt = typeof input.toolPayload.requestedAt === "string" ? input.toolPayload.requestedAt : null;
  const windowStart = requestedAt ? new Date(requestedAt) : new Date();
  const windowEnd = new Date(windowStart.getTime() + 60 * 60_000);

  const { data, error } = await admin
    .from("office_tasks")
    .select("id,title,due_at")
    .eq("user_id", input.userId)
    .gte("due_at", windowStart.toISOString())
    .lte("due_at", windowEnd.toISOString())
    .limit(10);

  if (error) {
    return { status: "failed", summary: "Could not check internal scheduling records.", output: { error: error.message } };
  }

  const conflicts = data ?? [];
  return {
    status: "completed",
    summary: conflicts.length > 0
      ? `${conflicts.length} other Dobly task(s) are scheduled near this time.`
      : "No scheduling conflicts found in Dobly's own task records.",
    output: { windowStart: windowStart.toISOString(), windowEnd: windowEnd.toISOString(), conflicts },
  };
}

async function handleReminderScheduler(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const admin = createAdminSupabaseClient();
  const remindAt = typeof input.toolPayload.remindAt === "string"
    ? input.toolPayload.remindAt
    : new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  const title = typeof input.toolPayload.title === "string" ? input.toolPayload.title : "Follow-up reminder";
  const summary = typeof input.toolPayload.summary === "string" ? input.toolPayload.summary : "Scheduled follow-up from an office task.";

  const { data, error } = await admin
    .from("office_tasks")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      department_id: input.toolPayload.departmentId ?? "operations",
      worker_key: "reminder_scheduler",
      runtime_kind: "automation",
      title,
      summary,
      risk_level: "low",
      status: "queued",
      approval_required: false,
      due_at: remindAt,
      max_attempts: 3,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "failed", summary: "Could not create the reminder task.", output: { error: error?.message } };
  }

  return {
    status: "completed",
    summary: `Reminder scheduled for ${remindAt}.`,
    output: { reminderTaskId: data.id, remindAt },
  };
}

async function handleInvoiceGenerator(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const payload = input.toolPayload;
  const amount = Number(payload.amount ?? (payload as Record<string, any>)?.invoice?.amount ?? 0);
  const currency = String(payload.currency ?? "KES");
  const customerName = String(payload.customerName ?? payload.recipient ?? "Customer");
  const customerEmail = typeof payload.customerEmail === "string" ? payload.customerEmail.trim() : "";
  const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString();
  const invoiceNumber = `DOB-${Date.now().toString(36).toUpperCase()}`;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoices")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      invoice_number: invoiceNumber,
      customer_name: customerName,
      amount,
      currency,
      status: "draft",
      due_at: dueAt,
    })
    .select("id")
    .single();

  if (error) {
    return {
      status: "completed",
      summary: `Prepared draft invoice ${invoiceNumber} for ${currency} ${amount} (not saved: ${error.message}).`,
      output: { invoiceNumber, customerName, amount, currency, dueAt, persisted: false },
    };
  }

  // No business-owned mpesa/paystack connection is required for this -
  // Dobly is the merchant of record on IntaSend, so a business with zero
  // payment-provider setup of its own can still get paid. Requires a
  // customer email (IntaSend's collection API needs one); if the task
  // didn't include one, the invoice is still saved, just without a link
  // yet - the coworker should ask for an email before this can go out.
  let checkoutUrl: string | null = null;
  let checkoutError: string | null = null;
  if (customerEmail) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dobly-dev.vercel.app";
      const link = await createHostedInvoicePaymentLink({
        invoiceId: data.id,
        userId: input.userId,
        amount,
        currency,
        customerEmail,
        customerName,
        description: `Invoice ${invoiceNumber}`,
        successUrl: `${appUrl}/dashboard/tasks`,
      });
      checkoutUrl = link.url;
    } catch (error) {
      checkoutError = error instanceof Error ? error.message : "Could not generate a payment link.";
    }
  }

  return {
    status: "completed",
    summary: checkoutUrl
      ? `Drafted invoice ${invoiceNumber} for ${currency} ${amount}, due ${dueAt.slice(0, 10)}. Payment link ready to send: ${checkoutUrl}`
      : customerEmail
        ? `Drafted invoice ${invoiceNumber} for ${currency} ${amount}, due ${dueAt.slice(0, 10)}. Could not generate a payment link yet: ${checkoutError}`
        : `Drafted invoice ${invoiceNumber} for ${currency} ${amount}, due ${dueAt.slice(0, 10)}. Need the customer's email to generate a payment link.`,
    output: { invoiceId: data?.id, invoiceNumber, customerName, amount, currency, dueAt, persisted: true, checkoutUrl },
  };
}

async function handleTicketClassifier(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const text = payloadText(input.toolPayload);
  const result = await askJson<{ category: string; priority: "low" | "medium" | "high" | "urgent"; is_complaint: boolean; summary: string }>({
    system: "Classify a support ticket. category is a short label (billing, bug, how_to, account, complaint, other). priority reflects business impact and customer emotion. is_complaint is true if the customer expresses dissatisfaction.",
    prompt: `Ticket:\n${text}`,
  });
  return {
    status: "completed",
    summary: `Ticket classified as ${result.category}, priority ${result.priority}${result.is_complaint ? " (complaint)" : ""}.`,
    output: result,
  };
}

async function handleKnowledgeBaseSearch(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const query = payloadText(input.toolPayload);
  const admin = createAdminSupabaseClient();
  const terms = query.toLowerCase().split(/[^a-z0-9]+/i).filter((term) => term.length > 2).slice(0, 8);

  const { data, error } = await admin
    .from("business_memory_items")
    .select("id,title,body,kind,tags")
    .eq("user_id", input.userId)
    .limit(50);

  if (error) {
    return { status: "failed", summary: "Could not search business memory.", output: { error: error.message } };
  }

  const scored = (data ?? [])
    .map((item) => {
      const haystack = `${item.title} ${item.body}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    status: "completed",
    summary: scored.length > 0
      ? `Found ${scored.length} relevant knowledge base entr${scored.length === 1 ? "y" : "ies"}.`
      : "No matching knowledge base entries found; this needs an owner-provided answer.",
    output: { matches: scored.map((row) => row.item) },
  };
}

async function handleResolutionRecommender(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const text = payloadText(input.toolPayload);
  const knowledgeContext = Array.isArray((input.toolPayload as Record<string, any>).knowledgeMatches)
    ? JSON.stringify((input.toolPayload as Record<string, any>).knowledgeMatches).slice(0, 1500)
    : "No matched knowledge base entries were supplied.";

  const result = await askJson<{ resolution: string; confidence: "low" | "medium" | "high"; requires_escalation: boolean }>({
    system: "Draft a customer-ready resolution for the support case using only the supplied context. Do not invent policy, refunds, or facts not present in context. If the context is insufficient, set requires_escalation to true and explain what is missing in resolution.",
    prompt: `Case:\n${text}\n\nKnown context:\n${knowledgeContext}`,
    maxTokens: 500,
  });

  return {
    status: "completed",
    summary: result.requires_escalation ? "Insufficient context; escalation recommended." : "Draft resolution prepared.",
    output: result,
  };
}

async function handleDataAnalyzer(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const admin = createAdminSupabaseClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();

  const { data, error } = await admin
    .from("office_events")
    .select("event_type,risk_level,occurred_at")
    .eq("user_id", input.userId)
    .gte("occurred_at", since)
    .limit(500);

  if (error) {
    return { status: "failed", summary: "Could not analyze recent activity.", output: { error: error.message } };
  }

  const rows = data ?? [];
  const byType: Record<string, number> = {};
  for (const row of rows) {
    const key = String(row.event_type);
    byType[key] = (byType[key] ?? 0) + 1;
  }
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    status: "completed",
    summary: `Analyzed ${rows.length} events from the last 30 days. Top signal: ${topTypes[0]?.[0] ?? "none"} (${topTypes[0]?.[1] ?? 0}).`,
    output: { totalEvents: rows.length, byType, topTypes },
  };
}

async function handlePatternDetector(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const admin = createAdminSupabaseClient();
  const since14 = new Date(Date.now() - 14 * 24 * 60 * 60_000).toISOString();
  const sincePrior14 = new Date(Date.now() - 28 * 24 * 60 * 60_000).toISOString();

  const eventType = typeof input.toolPayload.eventType === "string" ? input.toolPayload.eventType : null;

  const [recent, prior] = await Promise.all([
    admin.from("office_events").select("id", { count: "exact", head: true }).eq("user_id", input.userId).gte("occurred_at", since14).then((res) => res.count ?? 0),
    admin.from("office_events").select("id", { count: "exact", head: true }).eq("user_id", input.userId).gte("occurred_at", sincePrior14).lt("occurred_at", since14).then((res) => res.count ?? 0),
  ]);

  const delta = prior === 0 ? (recent > 0 ? 1 : 0) : (recent - prior) / prior;
  const anomaly = Math.abs(delta) >= 0.5 && (recent + prior) >= 4;

  return {
    status: "completed",
    summary: anomaly
      ? `Activity ${delta > 0 ? "spiked" : "dropped"} ${Math.round(Math.abs(delta) * 100)}% over the last 14 days${eventType ? ` for ${eventType}` : ""}.`
      : "No significant deviation detected in the last 14 days of activity.",
    output: { recentCount: recent, priorCount: prior, changeRatio: delta, anomaly },
  };
}

async function handleOpportunityScorer(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const text = payloadText(input.toolPayload);
  const result = await askJson<{ score: number; rationale: string; recommended_action: string }>({
    system: "Score a growth/sales opportunity from 0-100 based on evidence of demand, urgency, and fit described in the context. Do not invent evidence not present. rationale must cite what's actually in the text.",
    prompt: `Opportunity context:\n${text}`,
  });
  return {
    status: "completed",
    summary: `Opportunity scored ${result.score}/100. ${result.recommended_action}`,
    output: result,
  };
}

function shopifyOrigin(value: string) {
  const host = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) return null;
  return `https://${host}`;
}

async function getShopifyAccess(userId: string) {
  const connection = await getActiveConnectionForProvider(userId, "shopify").catch(() => null);
  if (!connection) return null;
  const secrets = await getDecryptedConnectionSecrets(connection.id).catch(() => null);
  const shopDomain = String((connection.metadata as Record<string, unknown> | null)?.shopDomain ?? "").trim();
  const origin = shopDomain ? shopifyOrigin(shopDomain) : null;
  if (!secrets?.accessToken || !origin) return null;
  return { accessToken: secrets.accessToken, origin };
}

async function handleInventoryMonitor(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const access = await getShopifyAccess(input.userId);
  if (!access) {
    return {
      status: "needs_connection",
      summary: "No connected store found; inventory cannot be checked live yet.",
      output: { connected: false },
    };
  }

  const response = await fetch(`${access.origin}/admin/api/2024-10/products.json?limit=50&fields=id,title,variants`, {
    headers: { "X-Shopify-Access-Token": access.accessToken },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { status: "failed", summary: `Shopify inventory check failed: ${response.status}.`, output: { error: data } };
  }

  const lowStockThreshold = Number(input.toolPayload.lowStockThreshold ?? 5);
  const products = Array.isArray(data.products) ? data.products : [];
  const lowStock = products.flatMap((product: Record<string, unknown>) =>
    (Array.isArray(product.variants) ? product.variants : [])
      .filter((variant: Record<string, unknown>) => Number(variant.inventory_quantity ?? 0) <= lowStockThreshold)
      .map((variant: Record<string, unknown>) => ({
        product: product.title,
        variant: variant.title,
        quantity: variant.inventory_quantity,
      })),
  );

  return {
    status: "completed",
    summary: lowStock.length > 0
      ? `${lowStock.length} variant(s) at or below ${lowStockThreshold} units.`
      : `Checked ${products.length} product(s); none at or below ${lowStockThreshold} units.`,
    output: { checkedProducts: products.length, lowStock },
  };
}

async function handleSupplierTracker(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operations_items")
    .select("id,title,status,due_at")
    .eq("user_id", input.userId)
    .in("status", ["blocked", "waiting_on_supplier", "overdue"])
    .limit(20);

  if (error) {
    return { status: "failed", summary: "Could not check operations records.", output: { error: error.message } };
  }

  const items = data ?? [];
  return {
    status: "completed",
    summary: items.length > 0
      ? `${items.length} operations item(s) are blocked or waiting on a supplier.`
      : "No blocked or overdue supplier items found.",
    output: { items },
  };
}

async function handleOrderProcessor(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const access = await getShopifyAccess(input.userId);
  if (!access) {
    return {
      status: "needs_connection",
      summary: "No connected store found; Dobly prepared the request but could not execute it live.",
      output: { preparedPayload: input.toolPayload },
    };
  }

  const response = await fetch(`${access.origin}/admin/api/2024-10/orders.json?status=open&limit=50&fields=id,name,financial_status,fulfillment_status,total_price,currency`, {
    headers: { "X-Shopify-Access-Token": access.accessToken },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { status: "failed", summary: `Shopify order check failed: ${response.status}.`, output: { error: data } };
  }

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const unfulfilled = orders.filter((order: Record<string, unknown>) => order.fulfillment_status !== "fulfilled");
  const unpaid = orders.filter((order: Record<string, unknown>) => order.financial_status !== "paid");

  return {
    status: "completed",
    summary: `${orders.length} open order(s): ${unfulfilled.length} unfulfilled, ${unpaid.length} unpaid.`,
    output: {
      openOrders: orders.length,
      unfulfilled: unfulfilled.map((o: Record<string, unknown>) => ({ id: o.id, name: o.name, total: o.total_price })),
      unpaid: unpaid.map((o: Record<string, unknown>) => ({ id: o.id, name: o.name, total: o.total_price })),
    },
  };
}

async function handlePaymentChecker(input: OfficeToolExecutionInput): Promise<OfficeToolExecutionResult> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("invoices")
    .select("id,invoice_number,amount,currency,status,due_at")
    .eq("user_id", input.userId)
    .neq("status", "paid")
    .lt("due_at", new Date().toISOString())
    .limit(20);

  if (error) {
    return { status: "failed", summary: "Could not check payment/invoice records.", output: { error: error.message } };
  }

  const overdue = data ?? [];
  const totalOwed = overdue.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return {
    status: "completed",
    summary: overdue.length > 0
      ? `${overdue.length} invoice(s) overdue, totaling ${overdue[0]?.currency ?? "KES"} ${totalOwed}.`
      : "No overdue invoices found.",
    output: { overdueInvoices: overdue, totalOwed },
  };
}

const HANDLERS: Record<string, (input: OfficeToolExecutionInput) => Promise<OfficeToolExecutionResult>> = {
  message_classifier: handleMessageClassifier,
  lead_qualifier: handleLeadQualifier,
  calendar_check: handleCalendarCheck,
  payment_checker: handlePaymentChecker,
  reminder_scheduler: handleReminderScheduler,
  invoice_generator: handleInvoiceGenerator,
  ticket_classifier: handleTicketClassifier,
  knowledge_base_search: handleKnowledgeBaseSearch,
  resolution_recommender: handleResolutionRecommender,
  data_analyzer: handleDataAnalyzer,
  pattern_detector: handlePatternDetector,
  opportunity_scorer: handleOpportunityScorer,
  inventory_monitor: handleInventoryMonitor,
  supplier_tracker: handleSupplierTracker,
  order_processor: handleOrderProcessor,
};

export async function executeRealInternalTool(
  input: OfficeToolExecutionInput,
  toolName: string,
): Promise<OfficeToolExecutionResult> {
  const handler = HANDLERS[toolName];
  if (!handler) {
    return {
      status: "unsupported",
      summary: `${toolName.replaceAll("_", " ")} has no real implementation yet.`,
      output: { toolName },
    };
  }

  try {
    return await handler(input);
  } catch (error) {
    return {
      status: "failed",
      summary: error instanceof Error ? error.message : `${toolName} failed.`,
      output: { toolName, error: error instanceof Error ? error.message : "Unknown error" },
    };
  }
}
