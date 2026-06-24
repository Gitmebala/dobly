import { getConnectionExecutionAuth } from "@/lib/connections";

export interface EmailSendResult {
  provider: "gmail" | "outlook" | "resend";
  id: string | null;
  status: "sent";
  summary: string;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  return [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    params.body,
  ].join("\r\n");
}

export async function sendConnectedEmail(params: {
  userId: string;
  to: string;
  subject: string;
  body: string;
  from?: string | null;
}) {
  let auth: Awaited<ReturnType<typeof getConnectionExecutionAuth>> | null = null;

  try {
    auth = await getConnectionExecutionAuth({
      userId: params.userId,
      providerIds: ["gmail", "google", "outlook", "microsoft"],
    });
  } catch {
    auth = null;
  }

  if (!auth) {
    return sendResendEmail(params);
  }

  const connection = auth.connection as Record<string, any>;
  const provider = String(connection.provider ?? "").toLowerCase();
  const metadata = (connection.metadata ?? {}) as Record<string, any>;
  const accessToken = auth.secrets.accessToken ?? metadata.access_token ?? metadata.accessToken;

  if (!accessToken) {
    throw new Error("Connected email account is missing an access token.");
  }

  if (provider.includes("gmail") || provider.includes("google")) {
    const from = params.from || metadata.email || "me";
    const raw = encodeBase64Url(
      buildMimeMessage({
        from,
        to: params.to,
        subject: params.subject,
        body: params.body,
      }),
    );

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof data?.error?.message === "string" ? data.error.message : "Gmail send failed.");
    }

    return {
      provider: "gmail",
      id: String(data.id ?? ""),
      status: "sent",
      summary: `Email sent to ${params.to} through Gmail.`,
    } satisfies EmailSendResult;
  }

  if (provider.includes("outlook") || provider.includes("microsoft")) {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: params.subject,
          body: { contentType: "Text", content: params.body },
          toRecipients: [{ emailAddress: { address: params.to } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data?.error?.message === "string" ? data.error.message : "Outlook send failed.");
    }

    return {
      provider: "outlook",
      id: null,
      status: "sent",
      summary: `Email sent to ${params.to} through Outlook.`,
    } satisfies EmailSendResult;
  }

  return sendResendEmail(params);
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  body: string;
  from?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = params.from || process.env.DOBLY_DEFAULT_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email is not configured. Connect Gmail/Outlook or set RESEND_API_KEY and DOBLY_DEFAULT_FROM_EMAIL.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.body,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Resend email send failed.");
  }

  return {
    provider: "resend",
    id: String(data.id ?? ""),
    status: "sent",
    summary: `Email sent to ${params.to} through Resend.`,
  } satisfies EmailSendResult;
}
