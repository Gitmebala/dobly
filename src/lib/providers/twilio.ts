type TwilioMethod = "GET" | "POST";

export interface TwilioAvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality?: string;
  region?: string;
  iso_country?: string;
  capabilities?: {
    voice?: boolean;
    SMS?: boolean;
    MMS?: boolean;
  };
}

export interface TwilioIncomingPhoneNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
  voice_url?: string;
  sms_url?: string;
  capabilities?: {
    voice?: boolean;
    sms?: boolean;
    mms?: boolean;
  };
}

export interface TwilioOutgoingCallerId {
  sid: string;
  phone_number: string;
  friendly_name: string;
  validation_code?: string;
}

export interface TwilioMessage {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }

  return { accountSid, authToken };
}

function authHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function twilioRequest<T>(params: {
  method: TwilioMethod;
  path: string;
  body?: Record<string, string | number | boolean | null | undefined>;
}) {
  const { accountSid, authToken } = getTwilioConfig();
  const url = `https://api.twilio.com${params.path}`;
  const form = new URLSearchParams();

  for (const [key, value] of Object.entries(params.body ?? {})) {
    if (value !== undefined && value !== null) form.set(key, String(value));
  }

  const response = await fetch(url, {
    method: params.method,
    headers: {
      Authorization: authHeader(accountSid, authToken),
      ...(params.method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: params.method === "POST" ? form.toString() : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : `Twilio request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return data as T;
}

export async function searchTwilioLocalNumbers(params: {
  country?: string;
  areaCode?: string;
  contains?: string;
  limit?: number;
}) {
  const { accountSid } = getTwilioConfig();
  const country = (params.country ?? "US").toUpperCase();
  const query = new URLSearchParams();
  if (params.areaCode) query.set("AreaCode", params.areaCode);
  if (params.contains) query.set("Contains", params.contains);
  query.set("SmsEnabled", "true");
  query.set("VoiceEnabled", "true");
  query.set("PageSize", String(Math.max(1, Math.min(params.limit ?? 10, 20))));

  const data = await twilioRequest<{ available_phone_numbers: TwilioAvailableNumber[] }>({
    method: "GET",
    path: `/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/Local.json?${query.toString()}`,
  });

  return data.available_phone_numbers ?? [];
}

export async function buyTwilioPhoneNumber(params: {
  phoneNumber: string;
  friendlyName?: string;
  voiceUrl?: string;
  smsUrl?: string;
}) {
  const { accountSid } = getTwilioConfig();
  return twilioRequest<TwilioIncomingPhoneNumber>({
    method: "POST",
    path: `/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    body: {
      PhoneNumber: params.phoneNumber,
      FriendlyName: params.friendlyName,
      VoiceUrl: params.voiceUrl,
      SmsUrl: params.smsUrl,
    },
  });
}

export async function startTwilioCallerIdVerification(params: {
  phoneNumber: string;
  friendlyName?: string;
}) {
  const { accountSid } = getTwilioConfig();
  return twilioRequest<TwilioOutgoingCallerId>({
    method: "POST",
    path: `/2010-04-01/Accounts/${accountSid}/OutgoingCallerIds.json`,
    body: {
      PhoneNumber: params.phoneNumber,
      FriendlyName: params.friendlyName ?? "Dobly business number",
    },
  });
}

export async function sendTwilioSms(params: {
  to: string;
  body: string;
  from?: string;
  messagingServiceSid?: string;
}) {
  const { accountSid } = getTwilioConfig();
  const messagingServiceSid = params.messagingServiceSid ?? process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!params.from && !messagingServiceSid) {
    throw new Error("Set a Twilio from number or TWILIO_MESSAGING_SERVICE_SID before sending SMS.");
  }

  return twilioRequest<TwilioMessage>({
    method: "POST",
    path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
    body: {
      To: params.to,
      Body: params.body,
      From: params.from,
      MessagingServiceSid: messagingServiceSid,
    },
  });
}
