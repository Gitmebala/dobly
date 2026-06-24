import { Resend } from "resend";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function getOwnerEmail(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  return typeof data?.email === "string" ? data.email.trim() : "";
}

export const emailConnectorExecutor: ConnectorExecutor = {
  id: "generic.email",
  async execute(context) {
    if (!resend) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const configuredTo = String(context.config.to ?? "").trim();
    const to = configuredTo || await getOwnerEmail(context.workflow.user_id);
    if (!to) {
      throw new Error("Email connector requires a recipient or a profile email.");
    }
    const body = String(context.config.body ?? context.config.text ?? context.step.description);

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? process.env.DOBLY_DEFAULT_FROM_EMAIL ?? "Dobly <hello@dobly.io>",
      to,
      subject: String(context.config.subject ?? context.step.name),
      text: body,
    });

    return {
      provider: "resend",
      sender: "dobly",
      to,
      messageId: result.data?.id ?? null,
    };
  },
};
