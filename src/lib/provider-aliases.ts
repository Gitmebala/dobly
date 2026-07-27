import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * One provider-resolution table for the whole app.
 *
 * This used to exist twice with different behaviour: the office tool executor
 * matched a requested tool against connection providers using this alias table
 * and `includes()`, while readiness checks used an exact `provider = ?` match.
 * So a real Google connection (stored as provider "google") would execute fine
 * but still report "Gmail isn't connected yet", because the coworker asks for
 * "gmail". Both paths now share this module.
 */
export const PROVIDER_TOOL_ALIASES: Record<string, string[]> = {
  gmail: ["gmail", "email", "google", "google workspace"],
  email: ["gmail", "outlook", "microsoft", "resend", "email", "google"],
  google_docs: ["google", "gmail", "google workspace"],
  google_sheets: ["google", "gmail", "google workspace"],
  google_drive: ["google", "gmail", "google workspace"],
  google_calendar: ["google", "calendar", "calendly", "gmail"],
  website_chat: ["website_chat", "web chat", "intercom", "crisp", "tawk", "chat"],
  sms: ["sms", "kenya_local_comms", "africas_talking", "twilio"],
  whatsapp: ["whatsapp", "wati", "respond.io", "meta"],
  paystack: ["paystack"],
  stripe: ["stripe"],
  mpesa: ["mpesa", "m-pesa", "daraja"],
  shopify: ["shopify"],
  crm: ["hubspot", "salesforce", "pipedrive", "zoho", "airtable", "crm"],
  hubspot: ["hubspot"],
  salesforce: ["salesforce"],
  zendesk: ["zendesk"],
  freshdesk: ["freshdesk"],
  intercom: ["intercom"],
  slack: ["slack"],
  notion: ["notion"],
  asana: ["asana"],
  trello: ["trello"],
  jira: ["jira"],
  linear: ["linear"],
  facebook: ["facebook", "meta"],
  instagram: ["instagram", "meta"],
  canva: ["canva"],
  mailchimp: ["mailchimp"],
  quickbooks: ["quickbooks"],
};

export function aliasesForProvider(requested: string) {
  const key = requested.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return PROVIDER_TOOL_ALIASES[key] ?? [key];
}

export function connectionMatchesProvider(connectionProvider: unknown, requested: string) {
  const provider = String(connectionProvider ?? "").toLowerCase();
  if (!provider) return false;
  return aliasesForProvider(requested).some((alias) => provider.includes(alias));
}

/**
 * Find a live connection that can serve `requested`, using alias matching so
 * "gmail" resolves against a stored "google" connection. Returns null instead
 * of throwing - callers here are gates, not execution paths.
 */
export async function findLiveConnectionForProvider(userId: string, requested: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "connected"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return null;
  return (
    (data ?? []).find((connection: Record<string, unknown>) =>
      connectionMatchesProvider(connection.provider, requested),
    ) ?? null
  );
}
