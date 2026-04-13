const required = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ENCRYPTION_KEY",
  "WORKER_SECRET",
];

const optionalGroups = {
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  microsoft: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
  slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  shopify: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"],
  notion: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
  hubspot: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
  airtable: ["AIRTABLE_CLIENT_ID", "AIRTABLE_CLIENT_SECRET"],
  meta: ["META_APP_ID", "META_APP_SECRET"],
  mpesa: ["MPESA_CALLBACK_URL"],
};

const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error("Missing required environment variables:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log("Required environment variables are present.");

for (const [group, vars] of Object.entries(optionalGroups)) {
  const configured = vars.every((name) => Boolean(process.env[name]));
  console.log(`${configured ? "OK" : "WARN"} ${group}: ${vars.join(", ")}`);
}
