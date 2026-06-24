import "server-only";

import { isPaystackConfigured } from "@/lib/paystack";

export type BillingGateway = "intasend" | "mpesa" | "paystack" | "stripe";

export function isIntaSendConfigured() {
  return Boolean(process.env.INTASEND_PUBLISHABLE_KEY && process.env.INTASEND_SECRET_KEY);
}

export function getPrimaryBillingGateway(market = "KE"): BillingGateway {
  const configured = String(process.env.BILLING_PROVIDER ?? "").toLowerCase();
  if (["intasend", "mpesa", "paystack", "stripe"].includes(configured)) {
    return configured as BillingGateway;
  }
  if (market.toUpperCase() === "KE") {
    if (isIntaSendConfigured()) return "intasend";
    if (isPaystackConfigured()) return "paystack";
    return "intasend";
  }
  return "stripe";
}

export function getBillingGatewayOrder(market = "KE"): BillingGateway[] {
  return market.toUpperCase() === "KE"
    ? ["intasend", "mpesa", "paystack", "stripe"]
    : ["stripe", "intasend", "paystack", "mpesa"];
}
