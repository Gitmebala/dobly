import { sendAfricaTalkingSMS } from "@/lib/phone/africas-talking";
import { sendTwilioSms, startTwilioCallerIdVerification } from "@/lib/providers/twilio";

export type DoblySmsProvider = "kenya_local" | "africas_talking" | "twilio";
export type PhoneVerificationProvider = DoblySmsProvider;

export interface DoblySmsResult {
  provider: DoblySmsProvider;
  providerMessageId: string | null;
  status: "sent" | "queued";
  raw?: unknown;
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("254")) return `+${trimmed}`;
  if (trimmed.startsWith("0")) return `+254${trimmed.slice(1)}`;
  return trimmed;
}

export function isKenyaPhoneNumber(value: string) {
  const normalized = normalizePhoneNumber(value).replace(/\s+/g, "");
  return normalized.startsWith("+254");
}

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function africaTalkingConfigured() {
  return Boolean(process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME);
}

function kenyaLocalSmsConfigured() {
  return Boolean(process.env.KENYA_SMS_API_URL && process.env.KENYA_SMS_API_KEY);
}

export function chooseSmsProvider(to: string): DoblySmsProvider {
  const requested = process.env.DOBLY_SMS_PROVIDER as DoblySmsProvider | undefined;
  if (requested) return requested;

  if (isKenyaPhoneNumber(to)) {
    if (kenyaLocalSmsConfigured()) return "kenya_local";
    if (africaTalkingConfigured()) return "africas_talking";
  }

  if (twilioConfigured()) return "twilio";
  if (africaTalkingConfigured()) return "africas_talking";
  return "kenya_local";
}

function extractProviderMessageId(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const direct =
    record.id ??
    record.messageId ??
    record.message_id ??
    record.sid ??
    record.requestId ??
    record.request_id;
  return typeof direct === "string" ? direct : null;
}

async function sendKenyaLocalSms(params: { to: string; body: string; from?: string }): Promise<DoblySmsResult> {
  const url = process.env.KENYA_SMS_API_URL;
  const apiKey = process.env.KENYA_SMS_API_KEY;
  if (!url || !apiKey) {
    if (process.env.NODE_ENV !== "production") {
      return {
        provider: "kenya_local",
        providerMessageId: null,
        status: "queued",
        raw: { developmentOnly: true },
      };
    }
    throw new Error("Kenya SMS is not configured. Set KENYA_SMS_API_URL and KENYA_SMS_API_KEY.");
  }

  const authHeader = process.env.KENYA_SMS_AUTH_HEADER || "Authorization";
  const authScheme = process.env.KENYA_SMS_AUTH_SCHEME || "Bearer";
  const from = params.from || process.env.KENYA_SMS_SENDER_ID || process.env.KENYA_SMS_FROM || "Dobly";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [authHeader]: authScheme ? `${authScheme} ${apiKey}` : apiKey,
    },
    body: JSON.stringify({
      to: normalizePhoneNumber(params.to),
      message: params.body,
      from,
      sender_id: from,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : "Kenya SMS delivery failed.";
    throw new Error(message);
  }

  return {
    provider: "kenya_local",
    providerMessageId: extractProviderMessageId(data),
    status: "sent",
    raw: data,
  };
}

export async function sendDoblySms(params: {
  to: string;
  body: string;
  from?: string;
  provider?: DoblySmsProvider;
}): Promise<DoblySmsResult> {
  const provider = params.provider ?? chooseSmsProvider(params.to);

  if (provider === "kenya_local") {
    return sendKenyaLocalSms(params);
  }

  if (provider === "africas_talking") {
    const result = await sendAfricaTalkingSMS({
      to: normalizePhoneNumber(params.to),
      message: params.body,
      from: params.from || process.env.AFRICASTALKING_SENDER_ID,
    });
    if (!result.success) {
      throw new Error(result.error || "Africa's Talking SMS delivery failed.");
    }
    return {
      provider,
      providerMessageId: result.messageId ?? null,
      status: "sent",
      raw: result,
    };
  }

  const result = await sendTwilioSms({
    to: normalizePhoneNumber(params.to),
    body: params.body,
    from: params.from || process.env.TWILIO_PHONE_NUMBER,
  });
  return {
    provider,
    providerMessageId: result.sid,
    status: "sent",
    raw: result,
  };
}

export async function startDoblyPhoneVerification(params: {
  phoneNumber: string;
  friendlyName?: string;
  code: string;
}): Promise<{
  provider: PhoneVerificationProvider;
  method: "sms_otp" | "twilio_caller_id";
  providerReferenceId: string | null;
  raw?: unknown;
}> {
  const normalized = normalizePhoneNumber(params.phoneNumber);
  const provider = chooseSmsProvider(normalized);

  if (provider !== "twilio" || isKenyaPhoneNumber(normalized)) {
    const message = await sendDoblySms({
      to: normalized,
      body: `Your Dobly verification code is ${params.code}. It expires in 10 minutes.`,
      provider,
    });
    return {
      provider: message.provider,
      method: "sms_otp",
      providerReferenceId: message.providerMessageId,
      raw: message.raw,
    };
  }

  const verification = await startTwilioCallerIdVerification({
    phoneNumber: normalized,
    friendlyName: params.friendlyName ?? "Dobly business number",
  });
  return {
    provider: "twilio",
    method: "twilio_caller_id",
    providerReferenceId: verification.sid,
    raw: verification,
  };
}

export function getKenyaLaunchTelecomCosts() {
  return {
    sms: {
      provider: "CommsGrid / Paygrid or equivalent local SMS gateway",
      starterBundle: "KES 50 for 100 SMS",
      senderId: "from KES 6,300 where required",
    },
    voice: {
      provider: "Africa's Talking",
      setup: "KES 5,000 + VAT per regular number",
      monthly: "KES 2,000 + VAT per regular number",
      outbound: "KES 2.50/minute",
      inbound: "free on provider side",
    },
    internationalFallback: {
      provider: "Twilio",
      usage: "only for non-Kenya numbers or markets where the local provider cannot serve the route",
    },
  };
}
