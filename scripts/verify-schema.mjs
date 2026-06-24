const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Schema verification requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const requiredRelations = [
  "profiles",
  "workspaces",
  "workspace_members",
  "workspace_invitations",
  "dobly_operators",
  "operator_chat_messages",
  "business_memory_items",
  "software_execution_runs",
  "software_execution_artifacts",
  "runtime_approvals",
  "runtime_audit_events",
  "custom_api_connections",
  "custom_api_actions",
  "job_queue",
  "usage_events",
  "notifications",
  "billing_accounts",
  "billing_ledger_entries",
];

const missing = [];
for (const relation of requiredRelations) {
  const response = await fetch(`${url}/rest/v1/${relation}?select=*&limit=0`, {
    method: "GET",
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!response.ok) missing.push(`${relation}: ${response.status} ${await response.text()}`);
}

if (missing.length) {
  console.error(`Database schema is incomplete:\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`Verified ${requiredRelations.length} required database relations.`);
