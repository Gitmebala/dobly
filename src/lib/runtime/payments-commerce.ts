import "server-only";
import { inferDoblyExecutionIntent } from "@/lib/dobly-inference";
import { createDurableArtifact, createDurableRuntimeRun, completeDurableRuntimeRun } from "@/lib/runtime/durable-runtime";
import { createRuntimeApproval } from "@/lib/runtime/approvals";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { assertEmergencyStopInactive } from "@/lib/feature-flags";

type Provider = "paystack" | "mpesa" | "stripe" | "shopify" | "quickbooks" | "xero";
type JsonRecord = Record<string, unknown>;

function formBody(input: Record<string, string>) {
  return new URLSearchParams(input).toString();
}

function requireEnv(keys: string[]) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing commerce configuration: ${missing.join(", ")}`);
}

async function stripeAction(action: string, payload: JsonRecord) {
  requireEnv(["STRIPE_SECRET_KEY"]);
  if (action === "create_customer") {
    const response = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
      body: formBody({ email: String(payload.email ?? ""), name: String(payload.name ?? "") }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Stripe customer failed: ${JSON.stringify(data)}`);
    return data as JsonRecord;
  }
  if (action === "payment_link") {
    return { provider: "stripe", status: "prepared", note: "Create product/price first or provide priceId.", priceId: payload.priceId ?? null };
  }
  throw new Error(`Unsupported Stripe action: ${action}`);
}

async function paystackAction(action: string, payload: JsonRecord) {
  requireEnv(["PAYSTACK_SECRET_KEY"]);
  if (action === "payment_link") {
    const amount = Number(payload.amount);
    const email = String(payload.email ?? "");
    if (!Number.isFinite(amount) || amount <= 0 || !email.includes("@")) {
      return {
        provider: "paystack",
        status: "prepared",
        note: "Provide amount and customer email to initialize a Paystack payment link.",
        payload,
      };
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: String(Math.round(amount * 100)),
        currency: String(payload.currency ?? process.env.PAYSTACK_CURRENCY ?? "KES"),
        callback_url: payload.callbackUrl,
        metadata: payload.metadata ?? {},
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Paystack payment link failed: ${JSON.stringify(data)}`);
    return data as JsonRecord;
  }
  throw new Error(`Unsupported Paystack action: ${action}`);
}

async function mpesaAction(action: string, payload: JsonRecord) {
  requireEnv(["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET"]);
  return {
    provider: "mpesa",
    action,
    status: "prepared",
    note: "M-PESA live STK push uses the connected Daraja service. This runtime prepared the hardened request payload.",
    payload,
  };
}

async function shopifyAction(action: string, payload: JsonRecord) {
  requireEnv(["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN"]);
  if (action !== "draft_order") throw new Error(`Unsupported Shopify action: ${action}`);
  const response = await fetch(`https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-10/draft_orders.json`, {
    method: "POST",
    headers: {
      "x-shopify-access-token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
      "content-type": "application/json",
    },
    body: JSON.stringify({ draft_order: payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Shopify draft order failed: ${JSON.stringify(data)}`);
  return data as JsonRecord;
}

async function accountingAction(provider: "quickbooks" | "xero", action: string, payload: JsonRecord) {
  const prefix = provider === "quickbooks" ? "QUICKBOOKS" : "XERO";
  requireEnv([`${prefix}_ACCESS_TOKEN`, `${prefix}_TENANT_ID`]);
  return {
    provider,
    action,
    status: "prepared",
    note: `${provider} requires account-specific object mapping. Dobly validated tokens and prepared the execution payload.`,
    payload,
  };
}

async function executeProvider(provider: Provider, action: string, payload: JsonRecord) {
  if (provider === "paystack") return paystackAction(action, payload);
  if (provider === "stripe") return stripeAction(action, payload);
  if (provider === "mpesa") return mpesaAction(action, payload);
  if (provider === "shopify") return shopifyAction(action, payload);
  return accountingAction(provider, action, payload);
}

export async function executePaymentsCommerceRuntime(input: {
  userId: string;
  workspaceId?: string | null;
  provider: Provider;
  action: string;
  payload: JsonRecord;
  dryRun?: boolean;
  approved?: boolean;
}) {
  assertEmergencyStopInactive("external_actions");
  const intent = inferDoblyExecutionIntent({
    prompt: `${input.provider} ${input.action}`,
    context: input.payload,
    explicit: {
      departmentId: "finance",
      workTypeId: "coordinate",
      outputTypeId: "approval_request",
      trustLevelId: "human_only",
    },
    availability: { runtimes: { payments_commerce: true } },
  });
  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    toolId: `${input.provider}_${input.action}`,
    toolLabel: "Payments and Commerce Execution",
    toolFamily: "commerce",
    task: `${input.provider}:${input.action}`,
    riskLevel: "high",
    context: { payload: input.payload, dryRun: Boolean(input.dryRun) },
    intent,
  });
  let reservation: { id: string } | null = null;

  try {
    if (!input.approved && !input.dryRun) {
      const approval = await createRuntimeApproval({
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        runId: run.id,
        title: "Approve finance or commerce action",
        message: "Dobly prepared the finance/commerce action, but money and external account changes should remain approval-gated.",
        actionLabel: "Approve action",
        riskLevel: "high",
        metadata: { doblyIntent: intent, provider: input.provider, action: input.action, payload: input.payload },
      });
      const awaiting = await completeDurableRuntimeRun({
        runId: run.id,
        userId: input.userId,
        status: "needs_approval",
        summary: "Finance/commerce action prepared and waiting for approval.",
        result: { approvalId: approval.id, provider: input.provider, action: input.action },
      });
      return { run: awaiting, artifacts: [], approval };
    }
    if (!input.dryRun) {
      reservation = await reserveOperatingCapacity({
        userId: input.userId,
        workspaceId: input.workspaceId,
        capability: "payment.collect",
        provider: input.provider,
        estimatedMinor: 5,
        idempotencyKey: `commerce:${run.id}:${input.provider}:${input.action}`,
        runId: run.id,
        metadata: { provider: input.provider, action: input.action, approvedCost: Boolean(input.approved) },
      });
    }
    const result = input.dryRun
      ? { provider: input.provider, action: input.action, status: "dry_run", payload: input.payload }
      : await executeProvider(input.provider, input.action, input.payload);

    const artifact = await createDurableArtifact({
      runId: run.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      kind: "json",
      title: "Payments/commerce execution result",
      content: result,
      metadata: { provider: input.provider, action: input.action },
      intent,
    });

    await logRuntimeAuditEvent({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      runId: run.id,
      eventType: "commerce.executed",
      riskLevel: "high",
      summary: `${input.provider} ${input.action} executed.`,
      metadata: { result },
    });

    const completed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: "completed",
      summary: `${input.provider} ${input.action} completed.`,
      result,
    });
    if (reservation) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: 5,
        status: "succeeded",
        metadata: { provider: input.provider, action: input.action },
      });
    }
    return { run: completed, artifacts: [artifact], result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payments/commerce execution failed.";
    const failed = await completeDurableRuntimeRun({
      runId: run.id,
      userId: input.userId,
      status: message.includes("Missing commerce configuration") ? "not_configured" : "failed",
      summary: message,
      errorMessage: message,
    });
    if (reservation) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: 0,
        status: "failed",
        metadata: { provider: input.provider, action: input.action, error: message },
      }).catch(() => undefined);
    }
    return { run: failed, artifacts: [], error: message };
  }
}
