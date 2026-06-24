import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "ENCRYPTION_KEY",
  "WORKER_SECRET",
  "SCHEDULER_SECRET",
];

const billingProvider = (process.env.BILLING_PROVIDER || "intasend").toLowerCase();
if (billingProvider === "stripe") {
  required.push("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
} else if (billingProvider === "paystack") {
  required.push("PAYSTACK_SECRET_KEY");
} else if (billingProvider === "mpesa") {
  required.push("DOBLY_MPESA_CONSUMER_KEY", "DOBLY_MPESA_CONSUMER_SECRET", "DOBLY_MPESA_PASSKEY", "DOBLY_MPESA_SHORTCODE", "DOBLY_MPESA_CALLBACK_URL");
} else {
  required.push("INTASEND_PUBLISHABLE_KEY", "INTASEND_SECRET_KEY");
}

const optionalGroups = {
  doblyToolGateway: ["DOBLY_TOOL_GATEWAY_URL", "DOBLY_TOOL_GATEWAY_TOKEN"],
  staticCoreMcpOverrides: [
    "ANTHROPIC_MCP_FIGMA_SERVER_URL",
    "ANTHROPIC_MCP_GITHUB_SERVER_URL",
    "ANTHROPIC_MCP_NOTION_SERVER_URL",
    "ANTHROPIC_MCP_BROWSER_SERVER_URL",
    "ANTHROPIC_MCP_DOCUMENT_SERVER_URL",
    "ANTHROPIC_MCP_MEDIA_SERVER_URL",
  ],
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  microsoft: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
  slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  shopify: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"],
  notion: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
  hubspot: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
  airtable: ["AIRTABLE_CLIENT_ID", "AIRTABLE_CLIENT_SECRET"],
  meta: ["META_APP_ID", "META_APP_SECRET"],
  intasend: ["INTASEND_PUBLISHABLE_KEY", "INTASEND_SECRET_KEY"],
  paystackPlans: ["PAYSTACK_PLAN_SIGNAL_ROOM", "PAYSTACK_PLAN_MOMENTUM_DESK", "PAYSTACK_PLAN_COMMAND_FLOOR"],
  mpesa: ["MPESA_CALLBACK_URL"],
  managedMpesaBilling: ["DOBLY_MPESA_CONSUMER_KEY", "DOBLY_MPESA_CONSUMER_SECRET", "DOBLY_MPESA_PASSKEY", "DOBLY_MPESA_SHORTCODE", "DOBLY_MPESA_CALLBACK_URL"],
  kenyaSms: ["KENYA_SMS_API_URL", "KENYA_SMS_API_KEY", "KENYA_SMS_SENDER_ID"],
  africaTalkingVoice: ["AFRICASTALKING_API_KEY", "AFRICASTALKING_USERNAME"],
  voiceSynthesis: ["ELEVENLABS_API_KEY"],
  canva: ["CANVA_CLIENT_ID", "CANVA_CLIENT_SECRET"],
  twilioInternationalFallback: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
  hostedConnectors: ["DOBLY_HOSTED_CONNECTOR_BASE_URL", "DOBLY_HOSTED_CONNECTOR_TOKEN"],
  googleHosted: ["DOBLY_HOSTED_GOOGLE_MCP_URL", "DOBLY_HOSTED_GOOGLE_MCP_TOKEN"],
  slackHosted: ["DOBLY_HOSTED_SLACK_MCP_URL", "DOBLY_HOSTED_SLACK_MCP_TOKEN"],
  hubspotHosted: ["DOBLY_HOSTED_HUBSPOT_MCP_URL", "DOBLY_HOSTED_HUBSPOT_MCP_TOKEN"],
  twilioHosted: ["DOBLY_HOSTED_TWILIO_MCP_URL", "DOBLY_HOSTED_TWILIO_MCP_TOKEN"],
  stripeHosted: ["DOBLY_HOSTED_STRIPE_MCP_URL", "DOBLY_HOSTED_STRIPE_MCP_TOKEN"],
  analytics: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
  serverAnalytics: ["POSTHOG_PROJECT_API_KEY"],
};

const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error("Missing required environment variables:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

const errors = [];
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
try {
  const parsed = new URL(appUrl);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (!local && parsed.protocol !== "https:") errors.push("NEXT_PUBLIC_APP_URL must use HTTPS outside local development.");
} catch {
  errors.push("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
}

for (const name of ["WORKER_SECRET", "SCHEDULER_SECRET", "COOKIE_SIGNING_SECRET"]) {
  if ((process.env[name] || "").length < 32) errors.push(`${name} must contain at least 32 characters.`);
}
const encryption = process.env.ENCRYPTION_KEY || "";
const encryptionBytes = encryption.length === 44 ? Buffer.from(encryption, "base64") : Buffer.from(encryption, "utf8");
if (encryptionBytes.length !== 32) errors.push("ENCRYPTION_KEY must be exactly 32 bytes or base64 for 32 bytes.");
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) errors.push("The Supabase anon and service-role keys must be different.");
const privilegedSecrets = [process.env.WORKER_SECRET, process.env.SCHEDULER_SECRET, process.env.COOKIE_SIGNING_SECRET, process.env.ENCRYPTION_KEY].filter(Boolean);
if (new Set(privilegedSecrets).size !== privilegedSecrets.length) errors.push("Worker, scheduler, cookie, and encryption secrets must be unique.");
if ((process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") && process.env.DOBLY_LOCAL_MODE === "true") {
  errors.push("DOBLY_LOCAL_MODE cannot be enabled in production.");
}
if ((process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") && process.env.INTASEND_TEST_MODE === "true") {
  errors.push("INTASEND_TEST_MODE must be false in production.");
}
if (errors.length) {
  console.error("Environment security checks failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Required environment variables are present.");
console.log("Dobly MCP strategy:");
console.log("- DOBLY_TOOL_GATEWAY_URL is the preferred single shared tool gateway.");
console.log("- Static core MCP URLs are optional direct overrides for specific high-value tools.");
console.log("- Universal user MCP connections are runtime records stored in Dobly state and do not require global env vars.");

for (const [group, vars] of Object.entries(optionalGroups)) {
  const configured = vars.every((name) => Boolean(process.env[name]));
  console.log(`${configured ? "OK" : "WARN"} ${group}: ${vars.join(", ")}`);
}

const hasWorkerDeployment =
  Boolean(process.env.DOBLY_WORKER_DEPLOYED) ||
  Boolean(process.env.RENDER_SERVICE_ID) ||
  Boolean(process.env.RAILWAY_SERVICE_ID) ||
  Boolean(process.env.FLY_APP_NAME);
console.log(`${hasWorkerDeployment ? "OK" : "WARN"} workerDeployment: set DOBLY_WORKER_DEPLOYED=true once runtime:worker is deployed outside the request lifecycle.`);
