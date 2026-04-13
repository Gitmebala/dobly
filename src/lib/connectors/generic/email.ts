import { Resend } from "resend";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const emailConnectorExecutor: ConnectorExecutor = {
  id: "generic.email",
  async execute(context) {
    if (!resend) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    const to = String(context.config.to ?? "").trim();
    if (!to) {
      throw new Error("Email connector requires a recipient.");
    }

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Dobly <hello@dobly.io>",
      to,
      subject: String(context.config.subject ?? context.step.name),
      text: String(context.config.text ?? context.step.description),
    });

    return {
      provider: "resend",
      to,
      messageId: result.data?.id ?? null,
    };
  },
};
