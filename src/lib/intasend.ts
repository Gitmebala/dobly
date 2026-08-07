import "server-only";

import { randomUUID } from "node:crypto";
import IntaSend from "intasend-node";
import { getDoblyPlan, type DoblyPlanId } from "@/lib/billing/plans";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type PaidPlanId = Exclude<DoblyPlanId, "free">;
type JsonRecord = Record<string, any>;

function getIntaSendClient() {
  const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
  const secretKey = process.env.INTASEND_SECRET_KEY;
  if (!publishableKey || !secretKey) throw new Error("IntaSend is not configured.");
  const testMode = process.env.INTASEND_TEST_MODE !== "false";
  return new IntaSend(publishableKey, secretKey, testMode);
}

function findString(source: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function createIntaSendCheckoutSession(input: {
  userId: string;
  workspaceId?: string | null;
  email: string;
  fullName?: string | null;
  planId: PaidPlanId;
  successUrl: string;
}) {
  const plan = getDoblyPlan(input.planId);
  const reference = `dobly-${input.planId}-${randomUUID()}`;
  const [firstName, ...rest] = String(input.fullName ?? input.email.split("@")[0]).trim().split(/\s+/);
  const lastName = rest.join(" ") || "Customer";
  const admin = createAdminSupabaseClient();
  const { data: pending, error: pendingError } = await admin
    .from("billing_checkout_sessions")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      provider: "intasend",
      reference,
      plan_id: input.planId,
      amount_minor: plan.monthlyPriceKes * 100,
      currency: "KES",
      status: "pending",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      metadata: { successUrl: input.successUrl },
    })
    .select("*")
    .single();
  if (pendingError) throw new Error(pendingError.message);

  try {
    const response = (await getIntaSendClient().collection().charge({
      first_name: firstName,
      last_name: lastName,
      email: input.email,
      host: new URL(input.successUrl).origin,
      amount: plan.monthlyPriceKes,
      currency: "KES",
      api_ref: reference,
      redirect_url: input.successUrl,
    })) as JsonRecord;
    const nested = response.invoice && typeof response.invoice === "object" ? response.invoice : {};
    const url = findString(response, ["url", "checkout_url", "payment_url"]) ?? findString(nested, ["url", "checkout_url"]);
    const checkoutId = findString(response, ["checkout_id", "checkoutId", "id"]);
    const invoiceId = findString(response, ["invoice_id", "invoiceId"]) ?? findString(nested, ["invoice_id", "id"]);
    if (!url) throw new Error("IntaSend did not return a checkout URL.");

    await admin
      .from("billing_checkout_sessions")
      .update({
        provider_checkout_id: checkoutId,
        provider_invoice_id: invoiceId,
        checkout_url: url,
        metadata: { successUrl: input.successUrl, response },
      })
      .eq("id", pending.id);
    return { provider: "intasend" as const, reference, url, checkoutId, invoiceId, raw: response };
  } catch (error) {
    await admin.from("billing_checkout_sessions").update({ status: "failed" }).eq("id", pending.id);
    throw error;
  }
}

export async function createIntaSendTopUpSession(input: {
  userId: string;
  workspaceId?: string | null;
  email: string;
  fullName?: string | null;
  planId: DoblyPlanId;
  amountKes: number;
  successUrl: string;
}) {
  const reference = `dobly-topup-${randomUUID()}`;
  const [firstName, ...rest] = String(input.fullName ?? input.email.split("@")[0]).trim().split(/\s+/);
  const lastName = rest.join(" ") || "Customer";
  const admin = createAdminSupabaseClient();
  const { data: pending, error } = await admin.from("billing_checkout_sessions").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    provider: "intasend",
    reference,
    plan_id: input.planId,
    amount_minor: Math.round(input.amountKes * 100),
    currency: "KES",
    status: "pending",
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    metadata: { kind: "top_up", successUrl: input.successUrl },
  }).select("*").single();
  if (error) throw new Error(error.message);
  try {
    const response = (await getIntaSendClient().collection().charge({
      first_name: firstName,
      last_name: lastName,
      email: input.email,
      host: new URL(input.successUrl).origin,
      amount: input.amountKes,
      currency: "KES",
      api_ref: reference,
      redirect_url: input.successUrl,
    })) as JsonRecord;
    const nested = response.invoice && typeof response.invoice === "object" ? response.invoice : {};
    const url = findString(response, ["url", "checkout_url", "payment_url"]) ?? findString(nested, ["url", "checkout_url"]);
    const checkoutId = findString(response, ["checkout_id", "checkoutId", "id"]);
    const invoiceId = findString(response, ["invoice_id", "invoiceId"]) ?? findString(nested, ["invoice_id", "id"]);
    if (!url) throw new Error("IntaSend did not return a checkout URL.");
    await admin.from("billing_checkout_sessions").update({ provider_checkout_id: checkoutId, provider_invoice_id: invoiceId, checkout_url: url, metadata: { kind: "top_up", successUrl: input.successUrl, response } }).eq("id", pending.id);
    return { provider: "intasend" as const, reference, url };
  } catch (checkoutError) {
    await admin.from("billing_checkout_sessions").update({ status: "failed" }).eq("id", pending.id);
    throw checkoutError;
  }
}

// Dobly-hosted payment collection: a business's coworkers use this to get
// the business paid by ITS OWN customers, without the business ever
// registering a Daraja/Paystack merchant account. Dobly is the merchant of
// record on IntaSend; the collected amount is tracked against the
// business's invoice row (see the migration adding invoices.checkout_url)
// so it can be reconciled and paid out to the business later. This is the
// "Dobly hosted" half of the per-connection-or-hosted pattern already used
// elsewhere (see [[dobly-per-user-connections]]) - a business that has
// connected its own mpesa/paystack account should use that path instead;
// this is the fallback for the common case where it hasn't.
export async function createHostedInvoicePaymentLink(input: {
  invoiceId: string;
  userId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string | null;
  description: string;
  successUrl: string;
}) {
  const [firstName, ...rest] = String(input.customerName ?? input.customerEmail.split("@")[0]).trim().split(/\s+/);
  const lastName = rest.join(" ") || "Customer";
  const reference = `dobly-invoice-${input.invoiceId}`;

  const response = (await getIntaSendClient().collection().charge({
    first_name: firstName,
    last_name: lastName,
    email: input.customerEmail,
    host: new URL(input.successUrl).origin,
    amount: input.amount,
    currency: input.currency,
    api_ref: reference,
    redirect_url: input.successUrl,
    narrative: input.description,
  })) as JsonRecord;

  const nested = response.invoice && typeof response.invoice === "object" ? response.invoice : {};
  const url = findString(response, ["url", "checkout_url", "payment_url"]) ?? findString(nested, ["url", "checkout_url"]);
  const invoiceRef = findString(response, ["invoice_id", "invoiceId"]) ?? findString(nested, ["invoice_id", "id"]);
  if (!url) throw new Error("IntaSend did not return a checkout URL for this invoice.");

  const admin = createAdminSupabaseClient();
  await admin
    .from("invoices")
    .update({ checkout_url: url, provider: "intasend_hosted", external_invoice_id: invoiceRef ?? reference })
    .eq("id", input.invoiceId)
    .eq("user_id", input.userId);

  return { url, reference, invoiceRef };
}

export async function verifyIntaSendPayment(input: {
  invoiceId: string;
  checkoutId?: string | null;
  signature?: string | null;
}) {
  return (await getIntaSendClient()
    .collection()
    .status(input.invoiceId, input.checkoutId ?? "", input.signature ?? "")) as JsonRecord;
}

export function isIntaSendPaymentSuccessful(payload: JsonRecord) {
  const nested = payload.invoice && typeof payload.invoice === "object" ? payload.invoice : {};
  const state = String(
    payload.state ?? payload.status ?? nested.state ?? nested.status ?? payload.invoice_state ?? "",
  ).toUpperCase();
  return ["COMPLETE", "COMPLETED", "PAID", "SUCCESS", "SUCCESSFUL"].includes(state);
}

export function extractIntaSendCallback(payload: JsonRecord) {
  const invoice = payload.invoice && typeof payload.invoice === "object" ? payload.invoice : {};
  return {
    reference: findString(payload, ["api_ref", "api_reference", "reference"]) ?? findString(invoice, ["api_ref", "api_reference", "reference"]),
    invoiceId: findString(payload, ["invoice_id", "invoiceId"]) ?? findString(invoice, ["invoice_id", "id"]),
    checkoutId: findString(payload, ["checkout_id", "checkoutId"]),
    signature: findString(payload, ["signature"]),
    providerEventId: findString(payload, ["event_id", "id"]) ?? findString(invoice, ["id"]),
  };
}
