import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { DOBLY_PLANS, type DoblyPlanId } from "@/lib/billing/plans";

type PaystackPlanId = Exclude<DoblyPlanId, "free">;

export type PaystackCheckoutSession = {
  provider: "paystack";
  reference: string;
  url: string;
  accessCode?: string;
  mode: "subscription" | "one_time";
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  };
};

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function getPrimaryBillingProvider(): "paystack" | "stripe" {
  const configured = process.env.BILLING_PROVIDER?.toLowerCase();
  if (configured === "stripe") return "stripe";
  if (configured === "paystack") return "paystack";
  return isPaystackConfigured() ? "paystack" : "stripe";
}

export function getPaystackPlanCode(planId: PaystackPlanId) {
  if (planId === "starter") {
    return process.env.PAYSTACK_PLAN_SIGNAL_ROOM ?? process.env.PAYSTACK_PLAN_STARTER ?? null;
  }
  if (planId === "operator") {
    return process.env.PAYSTACK_PLAN_MOMENTUM_DESK ?? process.env.PAYSTACK_PLAN_OPERATOR ?? null;
  }
  return process.env.PAYSTACK_PLAN_COMMAND_FLOOR ?? process.env.PAYSTACK_PLAN_COMMAND ?? null;
}

function getPaystackAmountKobo(planId: PaystackPlanId) {
  const plan = DOBLY_PLANS.find((candidate) => candidate.id === planId);
  if (!plan || plan.monthlyPriceUsd <= 0) {
    throw new Error(`Invalid Paystack plan: ${planId}`);
  }

  const kes = Math.round(plan.monthlyPriceUsd * 130);
  return String(kes * 100);
}

function getPaystackChannels() {
  const configured = process.env.PAYSTACK_CHANNELS;
  if (!configured) return ["card", "mobile_money"];
  return configured
    .split(",")
    .map((channel) => channel.trim())
    .filter(Boolean);
}

export async function createPaystackCheckoutSession({
  userId,
  email,
  planId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  planId: PaystackPlanId;
  successUrl: string;
  cancelUrl: string;
}): Promise<PaystackCheckoutSession> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("Missing PAYSTACK_SECRET_KEY");

  const plan = DOBLY_PLANS.find((candidate) => candidate.id === planId);
  if (!plan) throw new Error(`Invalid Paystack plan: ${planId}`);

  const planCode = getPaystackPlanCode(planId);
  const reference = `dobly-${planId}-${randomUUID()}`;
  const mode = planCode ? "subscription" : "one_time";
  const body = {
    email,
    amount: getPaystackAmountKobo(planId),
    currency: process.env.PAYSTACK_CURRENCY ?? "KES",
    reference,
    callback_url: successUrl,
    channels: getPaystackChannels(),
    metadata: {
      userId,
      planId,
      planName: plan.name,
      billingProvider: "paystack",
      checkoutMode: mode,
      cancel_action: cancelUrl,
    },
    ...(planCode ? { plan: planCode } : {}),
  };

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as PaystackInitializeResponse;
  const url = data.data?.authorization_url;
  if (!response.ok || !data.status || !url) {
    throw new Error(`Paystack checkout failed: ${data.message || response.statusText}`);
  }

  return {
    provider: "paystack",
    reference: data.data?.reference ?? reference,
    url,
    accessCode: data.data?.access_code,
    mode,
  };
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signature) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function getPlanFromPaystackMetadata(metadata: unknown): DoblyPlanId {
  if (!metadata || typeof metadata !== "object") return "free";
  const planId = (metadata as Record<string, unknown>).planId;
  if (planId === "starter" || planId === "operator" || planId === "command" || planId === "business") {
    return planId;
  }
  return "free";
}

export function getUserIdFromPaystackMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const userId = (metadata as Record<string, unknown>).userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

export async function cancelPaystackSubscription(subscriptionCode: string, emailToken: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  const response = await fetch("https://api.paystack.co/subscription/disable", {
    method: "POST",
    headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/json" },
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => null) as { status?: boolean; message?: string } | null;
  if (!response.ok || result?.status !== true) {
    throw new Error(result?.message || `Paystack cancellation failed (${response.status}).`);
  }
  return result;
}
