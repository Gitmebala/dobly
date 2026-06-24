import "server-only";

import { randomUUID } from "node:crypto";
import { getDoblyPlan, type DoblyPlanId } from "@/lib/billing/plans";
import { normalizeMarket, type DoblyMarket } from "@/lib/billing/market-strategy";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { BillableCapability } from "@/lib/billing/cost-catalog";
import { calculateTopUpOperatingAmount, createFundingIdempotencyKey, deriveCapacityStatus } from "@/lib/billing/economy-core";

type JsonRecord = Record<string, unknown>;

export class InsufficientOperatingCapacityError extends Error {
  code = "DOBLY_INSUFFICIENT_OPERATING_CAPACITY" as const;

  constructor(message = "This workspace has used its included operating capacity.") {
    super(message);
    this.name = "InsufficientOperatingCapacityError";
  }
}

export class CostConfirmationRequiredError extends Error {
  code = "DOBLY_COST_CONFIRMATION_REQUIRED" as const;
  estimatedMinor: number;

  constructor(estimatedMinor: number) {
    super("This unusually expensive action needs one confirmation before Dobly continues.");
    this.name = "CostConfirmationRequiredError";
    this.estimatedMinor = estimatedMinor;
  }
}

function throwBillingError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "Billing operation failed.");
  if (message.includes("DOBLY_INSUFFICIENT_OPERATING_CAPACITY")) {
    throw new InsufficientOperatingCapacityError();
  }
  throw new Error(message);
}

function billingWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

async function ensureBillingAccount(input: {
  userId: string;
  workspaceId?: string | null;
  market?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  let query = admin.from("billing_accounts").select("*").eq("user_id", input.userId);
  query = input.workspaceId ? query.eq("workspace_id", input.workspaceId) : query.is("workspace_id", null);
  const { data: existing } = await query.maybeSingle();
  const market = normalizeMarket(input.market);
  if (existing) {
    const { data, error } = await admin
      .from("billing_accounts")
      .update({
        market,
        currency: market === "KE" ? "KES" : "USD",
        billing_email: input.email ?? existing.billing_email ?? null,
        phone_number: input.phoneNumber ?? existing.phone_number ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throwBillingError(error);
    return data;
  }

  const { data, error } = await admin
    .from("billing_accounts")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      market,
      currency: market === "KE" ? "KES" : "USD",
      billing_email: input.email ?? null,
      phone_number: input.phoneNumber ?? null,
    })
    .select("*")
    .single();
  if (error) throwBillingError(error);
  return data;
}

async function claimPaymentEvent(input: {
  provider: string;
  providerEventId: string;
  eventType: string;
  userId?: string | null;
  workspaceId?: string | null;
  planId?: string | null;
  amountMinor?: number;
  currency?: string;
  payload?: JsonRecord;
  subscriptionMetadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("billing_payment_events")
    .select("*")
    .eq("provider", input.provider)
    .eq("provider_event_id", input.providerEventId)
    .maybeSingle();
  if (existing) return { event: existing, shouldProcess: existing.status !== "processed" };

  const { data, error } = await admin
    .from("billing_payment_events")
    .insert({
      provider: input.provider,
      provider_event_id: input.providerEventId,
      event_type: input.eventType,
      user_id: input.userId ?? null,
      workspace_id: input.workspaceId ?? null,
      plan_id: input.planId ?? null,
      amount_minor: Math.round(input.amountMinor ?? 0),
      currency: input.currency ?? "KES",
      payload: input.payload ?? {},
    })
    .select("*")
    .single();
  if (error) {
    if (String(error.message ?? "").toLowerCase().includes("duplicate")) {
      return claimPaymentEvent(input);
    }
    throwBillingError(error);
  }
  return { event: data, shouldProcess: true };
}

export async function fundOperatingWallet(input: {
  userId: string;
  workspaceId?: string | null;
  amountMinor: number;
  source: string;
  idempotencyKey: string;
  externalReference?: string | null;
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient() as any;
  const { data, error } = await admin.rpc("dobly_fund_wallet", {
    p_user_id: input.userId,
    p_workspace_id: input.workspaceId ?? null,
    p_amount_minor: Math.round(input.amountMinor),
    p_source: input.source,
    p_idempotency_key: input.idempotencyKey,
    p_external_reference: input.externalReference ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) throwBillingError(error);
  return data;
}

export async function activatePaidPlanPeriod(input: {
  provider: string;
  providerEventId: string;
  eventType: string;
  userId: string;
  workspaceId?: string | null;
  planId: Exclude<DoblyPlanId, "free">;
  market?: DoblyMarket;
  email?: string | null;
  phoneNumber?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  fundingPeriodKey?: string | null;
  amountMinor?: number;
  currency?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  payload?: JsonRecord;
  subscriptionMetadata?: JsonRecord;
}) {
  const plan = getDoblyPlan(input.planId);
  const claimed = await claimPaymentEvent({
    provider: input.provider,
    providerEventId: input.providerEventId,
    eventType: input.eventType,
    userId: input.userId,
    workspaceId: input.workspaceId,
    planId: input.planId,
    amountMinor: input.amountMinor ?? plan.monthlyPriceKes * 100,
    currency: input.currency ?? "KES",
    payload: input.payload,
  });
  if (!claimed.shouldProcess) return { processed: false, duplicate: true, event: claimed.event };

  const admin = createAdminSupabaseClient();
  const account = await ensureBillingAccount(input);
  const window = billingWindow(input.periodStart ? new Date(input.periodStart) : new Date());
  const periodStart = input.periodStart ?? window.start;
  const periodEnd = input.periodEnd ?? window.end;

  await fundOperatingWallet({
    userId: input.userId,
    workspaceId: input.workspaceId,
    amountMinor: plan.operatingAllowanceMinor,
    source: "subscription_allowance",
    idempotencyKey: createFundingIdempotencyKey(input.provider, "plan", input.fundingPeriodKey ?? input.providerEventId),
    externalReference: input.providerEventId,
    metadata: { planId: input.planId, periodStart, periodEnd },
  });

  let subscriptionQuery = admin.from("billing_subscriptions").select("*").eq("user_id", input.userId);
  if (input.providerSubscriptionId) {
    subscriptionQuery = subscriptionQuery
      .eq("provider", input.provider)
      .eq("provider_subscription_id", input.providerSubscriptionId);
  } else {
    subscriptionQuery = subscriptionQuery.eq("provider", input.provider).eq("plan_id", input.planId);
  }
  const { data: existingSubscription } = await subscriptionQuery.maybeSingle();
  const subscriptionValues = {
    billing_account_id: account.id,
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    plan_id: input.planId,
    plan_version: 1,
    provider: input.provider,
    provider_customer_id: input.providerCustomerId ?? null,
    provider_subscription_id: input.providerSubscriptionId ?? null,
    status: "active",
    current_period_start: periodStart,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
    metadata: { market: input.market ?? "KE", ...(input.subscriptionMetadata ?? {}) },
  };
  if (existingSubscription) {
    await admin.from("billing_subscriptions").update(subscriptionValues).eq("id", existingSubscription.id);
  } else {
    await admin.from("billing_subscriptions").insert(subscriptionValues);
  }

  await admin
    .from("profiles")
    .update({
      plan: input.planId,
      ...(input.provider === "stripe"
        ? {
            stripe_customer_id: input.providerCustomerId ?? null,
            stripe_subscription_id: input.providerSubscriptionId ?? null,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId);

  await admin
    .from("billing_payment_events")
    .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
    .eq("id", claimed.event.id);

  return { processed: true, duplicate: false, event: claimed.event, account, periodStart, periodEnd };
}

export async function fundPurchasedTopUp(input: {
  provider: string;
  providerEventId: string;
  fundingReference: string;
  userId: string;
  workspaceId?: string | null;
  paidAmountMinor: number;
  currency?: string;
  payload?: JsonRecord;
}) {
  const claimed = await claimPaymentEvent({
    provider: input.provider,
    providerEventId: input.providerEventId,
    eventType: "top_up.completed",
    userId: input.userId,
    workspaceId: input.workspaceId,
    amountMinor: input.paidAmountMinor,
    currency: input.currency ?? "KES",
    payload: input.payload,
  });
  if (!claimed.shouldProcess) return { processed: false, duplicate: true };
  const operatingAmountMinor = calculateTopUpOperatingAmount(input.paidAmountMinor);
  await fundOperatingWallet({
    userId: input.userId,
    workspaceId: input.workspaceId,
    amountMinor: operatingAmountMinor,
    source: "purchased_top_up",
    idempotencyKey: createFundingIdempotencyKey(input.provider, "topup", input.fundingReference),
    externalReference: input.fundingReference,
    metadata: { paidAmountMinor: input.paidAmountMinor, operatingAmountMinor },
  });
  const admin = createAdminSupabaseClient();
  await admin.from("billing_payment_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", claimed.event.id);
  return { processed: true, duplicate: false, operatingAmountMinor };
}

export async function markSubscriptionEnded(input: {
  provider: string;
  providerEventId: string;
  eventType: string;
  userId: string;
  providerSubscriptionId?: string | null;
  payload?: JsonRecord;
}) {
  const claimed = await claimPaymentEvent({ ...input, payload: input.payload });
  if (!claimed.shouldProcess) return { processed: false, duplicate: true };
  const admin = createAdminSupabaseClient();
  let query = admin.from("billing_subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("user_id", input.userId).eq("provider", input.provider);
  if (input.providerSubscriptionId) query = query.eq("provider_subscription_id", input.providerSubscriptionId);
  await query;
  await admin.from("profiles").update({ plan: "free", updated_at: new Date().toISOString() }).eq("id", input.userId);
  await admin.from("billing_payment_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("id", claimed.event.id);
  return { processed: true, duplicate: false };
}

export async function reserveOperatingCapacity(input: {
  userId: string;
  workspaceId?: string | null;
  capability: BillableCapability;
  provider: string;
  estimatedMinor: number;
  idempotencyKey?: string;
  runId?: string | null;
  jobId?: string | null;
  coworkerId?: string | null;
  metadata?: JsonRecord;
}) {
  const existingCapacity = await getOperatingCapacity({ userId: input.userId, workspaceId: input.workspaceId });
  if (!existingCapacity.walletId) {
    const admin = createAdminSupabaseClient();
    const { data: profile } = await admin.from("profiles").select("plan").eq("id", input.userId).maybeSingle();
    const plan = getDoblyPlan(String(profile?.plan ?? "free"));
    if (plan.id === "free") {
      await fundOperatingWallet({
        userId: input.userId,
        workspaceId: input.workspaceId,
        amountMinor: plan.operatingAllowanceMinor,
        source: "trial_allowance",
        idempotencyKey: `trial:${input.userId}:${input.workspaceId ?? "personal"}`,
        metadata: { planId: "free" },
      });
    }
  }
  const adminForPolicy = createAdminSupabaseClient();
  let policyQuery = adminForPolicy.from("billing_spending_policies").select("*").eq("user_id", input.userId);
  policyQuery = input.workspaceId ? policyQuery.eq("workspace_id", input.workspaceId) : policyQuery.is("workspace_id", null);
  const { data: policy } = await policyQuery.maybeSingle();
  const { data: planProfile } = await adminForPolicy.from("profiles").select("plan").eq("id", input.userId).maybeSingle();
  const activePlan = getDoblyPlan(String(planProfile?.plan ?? "free"));
  const approvedCost = input.metadata?.approvedCost === true;
  const confirmationMinor = Number(policy?.per_action_confirmation_minor ?? activePlan.premiumActionConfirmationMinor);
  if (confirmationMinor > 0 && input.estimatedMinor >= confirmationMinor && !approvedCost) {
    throw new CostConfirmationRequiredError(input.estimatedMinor);
  }
  if (policy?.monthly_cap_minor != null) {
    const window = billingWindow();
    let usageQuery = adminForPolicy
      .from("billing_usage_events")
      .select("actual_cost_minor")
      .eq("user_id", input.userId)
      .gte("created_at", window.start)
      .lt("created_at", window.end);
    if (input.workspaceId) usageQuery = usageQuery.eq("workspace_id", input.workspaceId);
    const { data: monthUsage } = await usageQuery;
    const spentMinor = (monthUsage ?? []).reduce((sum: number, event: any) => sum + Number(event.actual_cost_minor ?? 0), 0);
    if (spentMinor + input.estimatedMinor > Number(policy.monthly_cap_minor)) {
      throw new InsufficientOperatingCapacityError("This action would exceed the workspace's monthly spending cap.");
    }
  }
  const admin = createAdminSupabaseClient() as any;
  const { data, error } = await admin.rpc("dobly_reserve_usage", {
    p_user_id: input.userId,
    p_workspace_id: input.workspaceId ?? null,
    p_capability: input.capability,
    p_provider: input.provider,
    p_estimated_minor: Math.max(0, Math.round(input.estimatedMinor)),
    p_idempotency_key: input.idempotencyKey ?? `usage:${randomUUID()}`,
    p_run_id: input.runId ?? null,
    p_job_id: input.jobId ?? null,
    p_coworker_id: input.coworkerId ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) throwBillingError(error);
  return data;
}

export async function settleOperatingCapacity(input: {
  reservationId: string;
  actualMinor: number;
  status?: "succeeded" | "failed" | "cancelled";
  providerRequestId?: string | null;
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient() as any;
  const { data, error } = await admin.rpc("dobly_settle_usage", {
    p_reservation_id: input.reservationId,
    p_actual_minor: Math.max(0, Math.round(input.actualMinor)),
    p_status: input.status ?? "succeeded",
    p_provider_request_id: input.providerRequestId ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) throwBillingError(error);
  return data;
}

export async function releaseOperatingCapacity(reservationId: string, reason = "released") {
  const admin = createAdminSupabaseClient() as any;
  const { data, error } = await admin.rpc("dobly_release_usage", {
    p_reservation_id: reservationId,
    p_reason: reason,
  });
  if (error) throwBillingError(error);
  return data;
}

export async function getOperatingCapacity(input: { userId: string; workspaceId?: string | null }) {
  const admin = createAdminSupabaseClient();
  let query = admin.from("billing_wallets").select("*").eq("user_id", input.userId);
  query = input.workspaceId ? query.eq("workspace_id", input.workspaceId) : query.is("workspace_id", null);
  const { data: wallet } = await query.maybeSingle();
  const planId = await admin.from("profiles").select("plan").eq("id", input.userId).maybeSingle();
  const plan = getDoblyPlan(String(planId.data?.plan ?? "free"));
  const availableMinor = Number(wallet?.available_minor ?? 0);
  const reservedMinor = Number(wallet?.reserved_minor ?? 0);
  const spendableMinor = Math.max(0, availableMinor - reservedMinor);
  const state = deriveCapacityStatus(spendableMinor, plan.operatingAllowanceMinor);
  return {
    walletId: wallet?.id ?? null,
    currency: String(wallet?.currency ?? "KES"),
    availableMinor,
    reservedMinor,
    spendableMinor,
    planAllowanceMinor: plan.operatingAllowanceMinor,
    remainingPercent: state.remainingPercent,
    status: state.status,
  } as const;
}

export async function getBillingEconomySummary(input: { userId: string; workspaceId?: string | null }) {
  const admin = createAdminSupabaseClient();
  const capacity = await getOperatingCapacity(input);
  let usageQuery = admin
    .from("billing_usage_events")
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (input.workspaceId) usageQuery = usageQuery.eq("workspace_id", input.workspaceId);
  const [{ data: usage }, { data: policy }, { data: subscriptions }] = await Promise.all([
    usageQuery,
    admin.from("billing_spending_policies").select("*").eq("user_id", input.userId).maybeSingle(),
    admin.from("billing_subscriptions").select("*").eq("user_id", input.userId).order("updated_at", { ascending: false }).limit(5),
  ]);
  return { capacity, policy: policy ?? null, subscriptions: subscriptions ?? [], recentUsage: usage ?? [] };
}
