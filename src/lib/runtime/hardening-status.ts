import "server-only";
import { getRuntimeProviderHealth } from "@/lib/runtime/provider-health";

function envReady(keys: string[]) {
  return {
    ready: keys.every((key) => Boolean(process.env[key])),
    missing: keys.filter((key) => !process.env[key]),
  };
}

export function getRuntimeHardeningStatus() {
  const providers = getRuntimeProviderHealth();
  const publishing = {
    instagramFacebook: envReady(["META_APP_ID", "META_APP_SECRET"]),
    youtube: envReady(["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"]),
    linkedin: envReady(["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"]),
    x: envReady(["X_CLIENT_ID", "X_CLIENT_SECRET"]),
    tiktok: envReady(["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"]),
  };
  const payments = {
    paystack: envReady(["PAYSTACK_SECRET_KEY"]),
    mpesa: envReady(["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET"]),
    stripe: envReady(["STRIPE_SECRET_KEY"]),
    shopify: envReady(["SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"]),
    quickbooks: envReady(["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"]),
    xero: envReady(["XERO_CLIENT_ID", "XERO_CLIENT_SECRET"]),
  };

  return {
    backgroundWorkers: {
      ready: Boolean(process.env.WORKER_SECRET),
      missing: process.env.WORKER_SECRET ? [] : ["WORKER_SECRET"],
      script: "npm run runtime:worker",
    },
    scheduledWatchers: {
      ready: Boolean(process.env.SCHEDULER_SECRET),
      missing: process.env.SCHEDULER_SECRET ? [] : ["SCHEDULER_SECRET"],
      endpoint: "/api/internal/scheduler?watchers=true",
    },
    publishing,
    payments,
    voice: providers.filter((provider) => ["africas_talking", "kenya_sms", "twilio", "elevenlabs"].includes(provider.id)),
    memory: {
      durableSynthesis: true,
      writeBackApproval: true,
      embeddingsReady: Boolean(process.env.OPENAI_API_KEY || process.env.PINECONE_API_KEY),
      missing: [
        ...(!process.env.OPENAI_API_KEY ? ["OPENAI_API_KEY"] : []),
        ...(!process.env.PINECONE_API_KEY ? ["PINECONE_API_KEY"] : []),
      ],
    },
    security: {
      auditEvents: true,
      approvalGate: true,
      workerSecret: Boolean(process.env.WORKER_SECRET),
      schedulerSecret: Boolean(process.env.SCHEDULER_SECRET),
      artifactBucket: process.env.DOBLY_ARTIFACT_BUCKET || "dobly-artifacts",
    },
  };
}
