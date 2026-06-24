import "server-only";
import { getDoblyInternalServices } from "@/lib/internal-services";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type ReadinessStatus = "ready" | "partial" | "missing" | "watch";
type JsonRecord = Record<string, unknown>;

export interface StartupReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  summary: string;
  action: string;
}

export interface StartupReadinessSection {
  id: string;
  title: string;
  items: StartupReadinessItem[];
}

export interface StartupReadinessSnapshot {
  score: number;
  blockers: StartupReadinessItem[];
  watches: StartupReadinessItem[];
  metrics: {
    profiles: number;
    paidProfiles: number;
    workspaces: number;
    operators: number;
    activeOperators: number;
    connections: number;
    activeConnections: number;
    runsLast7Days: number;
    failedRunsLast7Days: number;
    pendingApprovals: number;
    queuedJobs: number;
    failedJobs: number;
    usageEventsLast30Days: number;
  };
  sections: StartupReadinessSection[];
}

function hasEnv(...keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]));
}

function anyEnv(...keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]));
}

function item(input: StartupReadinessItem) {
  return input;
}

async function countRows(table: string, build?: (query: any) => any) {
  const admin = createAdminSupabaseClient();
  try {
    let query = admin.from(table).select("*", { count: "exact", head: true });
    if (build) query = build(query);
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function envSections(): StartupReadinessSection[] {
  const billingProvider = (process.env.BILLING_PROVIDER || "intasend").toLowerCase();
  const intasendReady = hasEnv("INTASEND_PUBLISHABLE_KEY", "INTASEND_SECRET_KEY");
  const mpesaBillingReady = hasEnv("DOBLY_MPESA_CONSUMER_KEY", "DOBLY_MPESA_CONSUMER_SECRET", "DOBLY_MPESA_PASSKEY", "DOBLY_MPESA_SHORTCODE", "DOBLY_MPESA_CALLBACK_URL");
  const paystackReady = hasEnv("PAYSTACK_SECRET_KEY") && anyEnv("PAYSTACK_PLAN_SIGNAL_ROOM", "PAYSTACK_PLAN_MOMENTUM_DESK", "PAYSTACK_PLAN_COMMAND_FLOOR");
  const stripeReady = hasEnv("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
  const paymentReady = billingProvider === "stripe" ? stripeReady : billingProvider === "paystack" ? paystackReady : billingProvider === "mpesa" ? mpesaBillingReady : intasendReady;
  const voiceTransportReady = hasEnv("AFRICASTALKING_API_KEY", "AFRICASTALKING_USERNAME") || hasEnv("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER");
  const whatsappReady = hasEnv("META_APP_ID", "META_APP_SECRET") && anyEnv("META_WHATSAPP_ACCESS_TOKEN", "DOBLY_WHATSAPP_WEBHOOK_SECRET");
  const analyticsReady = hasEnv("NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST");

  return [
    {
      id: "core",
      title: "Core launch stack",
      items: [
        item({
          id: "app-url",
          label: "Production app URL",
          status: hasEnv("NEXT_PUBLIC_APP_URL") ? "ready" : "missing",
          summary: "Canonical URL used for auth, checkout, webhooks, and redirects.",
          action: "Set NEXT_PUBLIC_APP_URL and APP_URL to the production domain.",
        }),
        item({
          id: "supabase",
          label: "Supabase runtime",
          status: hasEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY") ? "ready" : "missing",
          summary: "Auth, operating state, runs, approvals, memory, and connections.",
          action: "Fill Supabase env vars and apply required SQL migrations.",
        }),
        item({
          id: "security-secrets",
          label: "Security secrets",
          status: hasEnv("ENCRYPTION_KEY", "WORKER_SECRET", "SCHEDULER_SECRET") ? "ready" : "missing",
          summary: "Secret encryption, internal worker access, and scheduled runtime protection.",
          action: "Set strong ENCRYPTION_KEY, WORKER_SECRET, and SCHEDULER_SECRET.",
        }),
        item({
          id: "worker",
          label: "Background worker",
          status: Boolean(process.env.DOBLY_WORKER_DEPLOYED) ? "ready" : "partial",
          summary: "Dobly needs a worker outside request lifecycle to keep operators and queues moving.",
          action: "Deploy runtime:worker and set DOBLY_WORKER_DEPLOYED=true.",
        }),
      ],
    },
    {
      id: "intelligence",
      title: "Intelligence layer",
      items: [
        item({
          id: "anthropic",
          label: "Reasoning model",
          status: hasEnv("ANTHROPIC_API_KEY") ? "ready" : "missing",
          summary: "Primary operator reasoning, planning, and high-agency judgment.",
          action: "Add ANTHROPIC_API_KEY.",
        }),
        item({
          id: "openai",
          label: "Utility/media model",
          status: hasEnv("OPENAI_API_KEY") ? "ready" : "partial",
          summary: "Low-cost synthesis and image/media runtime support.",
          action: "Add OPENAI_API_KEY for cheaper utility tasks and media generation.",
        }),
        item({
          id: "research",
          label: "Research runtime",
          status: "ready",
          summary: "Direct public sources and indexes are the baseline; Perplexity and Firecrawl are premium fallbacks.",
          action: "Add PERPLEXITY_API_KEY only for premium deep research and FIRECRAWL_API_KEY only when crawling is needed.",
        }),
        item({
          id: "memory",
          label: "Memory depth",
          status: "ready",
          summary: "PostgreSQL stores durable memory and pgvector provides the semantic-memory path without Pinecone.",
          action: "Apply the Dobly billing/economy migration and configure an embedding provider only when semantic retrieval is needed.",
        }),
      ],
    },
    {
      id: "channels",
      title: "Customer-facing channels",
      items: [
        item({
          id: "email",
          label: "Transactional email",
          status: hasEnv("RESEND_API_KEY", "EMAIL_FROM") ? "ready" : "missing",
          summary: "Signup, reset, verification, alerts, and customer-facing delivery.",
          action: "Verify sender domain and set RESEND_API_KEY plus EMAIL_FROM.",
        }),
        item({
          id: "whatsapp",
          label: "WhatsApp",
          status: whatsappReady ? "ready" : "partial",
          summary: "Core launch channel for reception, support, approvals, and follow-up.",
          action: "Configure Meta app, WhatsApp access token, phone number ID, and webhook secret.",
        }),
        item({
          id: "voice",
          label: "Voice and calls",
          status: voiceTransportReady ? "ready" : "partial",
          summary: "Receptionist calls require a phone transport plus STT/TTS/agent handling.",
          action: "Configure Africa's Talking or Twilio; add Deepgram/ElevenLabs for richer voice.",
        }),
        item({
          id: "payments",
          label: "Billing and payments",
          status: paymentReady ? "ready" : "missing",
          summary: "Paid conversion, plan enforcement, webhooks, and Kenya-first billing.",
          action: "Configure IntaSend and the managed M-Pesa callback; keep Paystack and Stripe as optional fallbacks.",
        }),
      ],
    },
    {
      id: "observability",
      title: "Observability and trust",
      items: [
        item({
          id: "analytics",
          label: "Product analytics",
          status: analyticsReady ? "ready" : "partial",
          summary: "Activation, conversion, retention, and failure funnels.",
          action: "Set PostHog env vars and track launch funnel events.",
        }),
        item({
          id: "error-monitoring",
          label: "Error monitoring",
          status: hasEnv("SENTRY_DSN") ? "ready" : "partial",
          summary: "Production errors should be visible before users report them.",
          action: "Add SENTRY_DSN and wire deployment release tracking.",
        }),
        item({
          id: "internal-services",
          label: "Internal service status",
          status: getDoblyInternalServices().every((service) => service.configured) ? "ready" : "partial",
          summary: "Ops route reports configured services, queue, and telemetry readiness.",
          action: "Use /api/internal/services/status and this cockpit during every launch check.",
        }),
      ],
    },
  ];
}

function scoreSections(sections: StartupReadinessSection[]) {
  const values = sections.flatMap((section) => section.items);
  const score = values.reduce((sum, row) => {
    if (row.status === "ready") return sum + 1;
    if (row.status === "partial" || row.status === "watch") return sum + 0.45;
    return sum;
  }, 0);
  return values.length ? Math.round((score / values.length) * 100) : 0;
}

async function launchMetrics() {
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    profiles,
    paidProfiles,
    workspaces,
    operators,
    activeOperators,
    connections,
    activeConnections,
    runsLast7Days,
    failedRunsLast7Days,
    pendingApprovals,
    queuedJobs,
    failedJobs,
    usageEventsLast30Days,
  ] = await Promise.all([
    countRows("profiles"),
    countRows("profiles", (query) => query.not("plan", "in", "(free,starter)").not("plan", "is", null)),
    countRows("workspaces"),
    countRows("dobly_operators"),
    countRows("dobly_operators", (query) => query.eq("status", "active")),
    countRows("connections"),
    countRows("connections", (query) => query.eq("status", "active")),
    countRows("software_execution_runs", (query) => query.gte("started_at", since7)),
    countRows("software_execution_runs", (query) => query.gte("started_at", since7).in("status", ["failed", "not_configured"])),
    countRows("approvals", (query) => query.eq("status", "pending")),
    countRows("job_queue", (query) => query.eq("status", "queued")),
    countRows("job_queue", (query) => query.eq("status", "failed")),
    countRows("usage_events", (query) => query.gte("created_at", since30)),
  ]);

  return {
    profiles,
    paidProfiles,
    workspaces,
    operators,
    activeOperators,
    connections,
    activeConnections,
    runsLast7Days,
    failedRunsLast7Days,
    pendingApprovals,
    queuedJobs,
    failedJobs,
    usageEventsLast30Days,
  };
}

function runtimeWatchItems(metrics: StartupReadinessSnapshot["metrics"]): StartupReadinessItem[] {
  const items: StartupReadinessItem[] = [];
  if (metrics.operators === 0) {
    items.push(item({
      id: "no-operators",
      label: "No operators created",
      status: "missing",
      summary: "The startup cannot validate Dobly until at least one real Operator exists.",
      action: "Create and run Reception, Sales Follow-up, and General Manager operators.",
    }));
  }
  if (metrics.connections === 0) {
    items.push(item({
      id: "no-connections",
      label: "No connected channels",
      status: "missing",
      summary: "Operators need channels/tools before they can act in the business.",
      action: "Connect email, WhatsApp, payments, and voice/SMS for the first launch workspace.",
    }));
  }
  if (metrics.failedRunsLast7Days > 0) {
    items.push(item({
      id: "failed-runs",
      label: "Recent failed runs",
      status: "watch",
      summary: `${metrics.failedRunsLast7Days} runtime runs failed or were not configured in the last 7 days.`,
      action: "Open failed run records and fix provider/env/tool gaps before inviting users.",
    }));
  }
  if (metrics.queuedJobs > 5) {
    items.push(item({
      id: "queue-pressure",
      label: "Queue pressure",
      status: "watch",
      summary: `${metrics.queuedJobs} jobs are still queued.`,
      action: "Confirm runtime worker is deployed and draining jobs.",
    }));
  }
  return items;
}

export async function buildStartupReadinessSnapshot(): Promise<StartupReadinessSnapshot> {
  const sections = envSections();
  const metrics = await launchMetrics();
  const runtimeWatches = runtimeWatchItems(metrics);
  const allItems = [...sections.flatMap((section) => section.items), ...runtimeWatches];
  const blockers = allItems.filter((row) => row.status === "missing");
  const watches = allItems.filter((row) => row.status === "watch" || row.status === "partial");

  return {
    score: scoreSections(sections),
    blockers,
    watches,
    metrics,
    sections: runtimeWatches.length
      ? [
          ...sections,
          {
            id: "runtime-signals",
            title: "Runtime startup signals",
            items: runtimeWatches,
          },
        ]
      : sections,
  };
}

export function startupReadinessToJson(snapshot: StartupReadinessSnapshot): JsonRecord {
  return snapshot as unknown as JsonRecord;
}
