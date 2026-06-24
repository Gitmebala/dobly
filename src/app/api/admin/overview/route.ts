import { NextResponse } from "next/server";
import { requireDoblyAdmin } from "@/lib/admin/access";
import { DOBLY_PLANS } from "@/lib/billing/plans";
import { getCoverageSummary } from "@/lib/use-case-coverage";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

async function safeCount(supabase: any, table: string) {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function GET() {
  const { supabase, allowed } = await requireDoblyAdmin();
  if (!allowed) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const admin = createAdminSupabaseClient();

  const [
    profiles,
    channels,
    workers,
    tasks,
    memory,
    usage,
    events,
  ] = await Promise.all([
    safeCount(supabase, "profiles"),
    safeCount(supabase, "business_channel_connections"),
    safeCount(supabase, "office_workers"),
    safeCount(supabase, "office_tasks"),
    safeCount(supabase, "business_memory_items"),
    safeCount(supabase, "usage_events"),
    safeCount(supabase, "office_events"),
  ]);

  const { data: recentTasks } = await supabase
    .from("office_tasks")
    .select("id,title,status,risk_level,created_at,user_id")
    .order("created_at", { ascending: false })
    .limit(10);

  const [{ data: billingUsage }, { data: wallets }, { data: paymentEvents }, { data: providerAccounts }] = await Promise.all([
    admin.from("billing_usage_events").select("actual_cost_minor,customer_cost_minor,provider,status,created_at").order("created_at", { ascending: false }).limit(5000),
    admin.from("billing_wallets").select("available_minor,reserved_minor,lifetime_funded_minor,lifetime_spent_minor"),
    admin.from("billing_payment_events").select("provider,status,amount_minor,currency,created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("billing_provider_accounts").select("provider,market,currency,status,funding_mode,balance_minor,low_balance_threshold_minor,last_balance_check_at").order("provider"),
  ]);
  const sum = (rows: any[], key: string) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

  return NextResponse.json({
    metrics: {
      profiles,
      channels,
      workers,
      tasks,
      memory,
      usage,
      events,
    },
    plans: DOBLY_PLANS,
    coverage: getCoverageSummary(),
    recentTasks: recentTasks ?? [],
    economy: {
      providerCostMinor: sum(billingUsage ?? [], "actual_cost_minor"),
      customerCostMinor: sum(billingUsage ?? [], "customer_cost_minor"),
      walletAvailableMinor: sum(wallets ?? [], "available_minor"),
      walletReservedMinor: sum(wallets ?? [], "reserved_minor"),
      lifetimeFundedMinor: sum(wallets ?? [], "lifetime_funded_minor"),
      lifetimeSpentMinor: sum(wallets ?? [], "lifetime_spent_minor"),
      recentPaymentEvents: paymentEvents ?? [],
      providerAccounts: providerAccounts ?? [],
    },
    observability: {
      posthog: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      sentry: process.env.SENTRY_ORG ? `https://sentry.io/organizations/${process.env.SENTRY_ORG}/` : null,
    },
  });
}
