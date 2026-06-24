import "server-only";

import { randomUUID } from "node:crypto";
import { fetchDarajaAccessToken, getDarajaBaseUrl } from "@/lib/mpesa/daraja";
import { getDoblyPlan, type DoblyPlanId } from "@/lib/billing/plans";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type PaidPlanId = Exclude<DoblyPlanId, "free">;
type Environment = "sandbox" | "production";

function managedConfig() {
  const environment: Environment = (process.env.DOBLY_MPESA_ENV ?? process.env.MPESA_ENV) === "production" ? "production" : "sandbox";
  const consumerKey = process.env.DOBLY_MPESA_CONSUMER_KEY ?? process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.DOBLY_MPESA_CONSUMER_SECRET ?? process.env.MPESA_CONSUMER_SECRET;
  const passkey = process.env.DOBLY_MPESA_PASSKEY ?? process.env.MPESA_PASSKEY;
  const shortcode = process.env.DOBLY_MPESA_SHORTCODE ?? process.env.MPESA_SHORTCODE;
  const callbackUrl = process.env.DOBLY_MPESA_CALLBACK_URL ?? process.env.MPESA_CALLBACK_URL;
  if (!consumerKey || !consumerSecret || !passkey || !shortcode || !callbackUrl) {
    throw new Error("Dobly's managed M-Pesa billing rail is not configured.");
  }
  return { environment, consumerKey, consumerSecret, passkey, shortcode, callbackUrl };
}

function timestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function password(shortcode: string, passkey: string, value: string) {
  return Buffer.from(`${shortcode}${passkey}${value}`).toString("base64");
}

export function normalizeKenyaPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  throw new Error("Enter a valid Kenyan mobile number.");
}

export async function startManagedMpesaPlanPayment(input: {
  userId: string;
  workspaceId?: string | null;
  planId: PaidPlanId;
  phoneNumber: string;
}) {
  const config = managedConfig();
  const plan = getDoblyPlan(input.planId);
  const reference = `dobly-${input.planId}-${randomUUID()}`;
  const phoneNumber = normalizeKenyaPhone(input.phoneNumber);
  const admin = createAdminSupabaseClient();
  const { data: checkout, error } = await admin
    .from("billing_checkout_sessions")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      provider: "mpesa",
      reference,
      plan_id: input.planId,
      amount_minor: plan.monthlyPriceKes * 100,
      currency: "KES",
      status: "pending",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadata: { phoneNumber },
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const token = await fetchDarajaAccessToken(config);
  const stamp = timestamp();
  const response = await fetch(`${getDarajaBaseUrl(config.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password(config.shortcode, config.passkey, stamp),
      Timestamp: stamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: plan.monthlyPriceKes,
      PartyA: phoneNumber,
      PartyB: config.shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: config.callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: `${plan.name} monthly plan`.slice(0, 20),
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok || !payload.CheckoutRequestID) {
    await admin.from("billing_checkout_sessions").update({ status: "failed", metadata: { phoneNumber, response: payload } }).eq("id", checkout.id);
    throw new Error(String(payload.errorMessage ?? payload.ResponseDescription ?? "M-Pesa STK request failed."));
  }
  await admin
    .from("billing_checkout_sessions")
    .update({
      provider_checkout_id: payload.CheckoutRequestID,
      provider_invoice_id: payload.MerchantRequestID ?? null,
      metadata: { phoneNumber, response: payload },
    })
    .eq("id", checkout.id);
  return { reference, checkoutRequestId: String(payload.CheckoutRequestID), customerMessage: payload.CustomerMessage ?? "Check your phone to complete payment." };
}

export async function verifyManagedMpesaPayment(checkoutRequestId: string) {
  const config = managedConfig();
  const token = await fetchDarajaAccessToken(config);
  const stamp = timestamp();
  const response = await fetch(`${getDarajaBaseUrl(config.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password(config.shortcode, config.passkey, stamp),
      Timestamp: stamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) throw new Error("M-Pesa payment verification failed.");
  return { successful: Number(payload.ResultCode) === 0, payload };
}
