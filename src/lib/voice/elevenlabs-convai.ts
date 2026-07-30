import "server-only";

/**
 * Real outbound phone calls via ElevenLabs Conversational AI's Twilio
 * integration. ElevenLabs places the call through the registered Twilio
 * number and bridges the audio to a live conversational agent itself -
 * Dobly doesn't need to terminate a media stream (which
 * /api/webhooks/twilio/voice/stream correctly documents this app can't do).
 *
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER,
 * ELEVENLABS_API_KEY, and ELEVENLABS_AGENT_ID - all already provisioned in
 * production but previously unused by any calling code.
 */

const API_BASE = "https://api.elevenlabs.io/v1/convai";

export function isVoiceCallingConfigured() {
  return Boolean(
    process.env.ELEVENLABS_API_KEY &&
      process.env.ELEVENLABS_AGENT_ID &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER,
  );
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

async function elevenLabsFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "xi-api-key": requireEnv("ELEVENLABS_API_KEY"),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`ElevenLabs API error (${response.status}): ${JSON.stringify(data)}`);
  }
  return data as Record<string, unknown>;
}

let cachedPhoneNumberId: string | null = null;

/**
 * ElevenLabs needs the Twilio number registered on its side before it can
 * place calls through it. Idempotent: looks up the existing registration by
 * phone number first, only registers if genuinely missing. The result is
 * cached in-memory for the life of the serverless instance - worst case is
 * one extra lookup per cold start, not per call.
 */
async function ensureTwilioPhoneRegistered(): Promise<string> {
  if (cachedPhoneNumberId) return cachedPhoneNumberId;

  const twilioNumber = requireEnv("TWILIO_PHONE_NUMBER");
  const existing = await elevenLabsFetch("/phone-numbers");
  const numbers = Array.isArray((existing as { phone_numbers?: unknown[] }).phone_numbers)
    ? ((existing as { phone_numbers: Array<Record<string, unknown>> }).phone_numbers)
    : [];
  const match = numbers.find((entry) => entry.phone_number === twilioNumber);
  if (match?.phone_number_id) {
    cachedPhoneNumberId = String(match.phone_number_id);
    return cachedPhoneNumberId;
  }

  const created = await elevenLabsFetch("/phone-numbers", {
    method: "POST",
    body: JSON.stringify({
      phone_number: twilioNumber,
      label: "Dobly business line",
      sid: requireEnv("TWILIO_ACCOUNT_SID"),
      token: requireEnv("TWILIO_AUTH_TOKEN"),
    }),
  });

  const phoneNumberId = String((created as { phone_number_id?: string }).phone_number_id ?? "");
  if (!phoneNumberId) throw new Error("ElevenLabs did not return a phone_number_id after registration.");
  cachedPhoneNumberId = phoneNumberId;
  return phoneNumberId;
}

export async function placeOutboundCall(input: {
  to: string;
  firstMessage?: string;
  objective?: string;
  dynamicVariables?: Record<string, string>;
}) {
  if (!isVoiceCallingConfigured()) {
    throw new Error("Voice calling is not configured (missing Twilio or ElevenLabs credentials).");
  }

  const agentPhoneNumberId = await ensureTwilioPhoneRegistered();

  const data = await elevenLabsFetch("/twilio/outbound-call", {
    method: "POST",
    body: JSON.stringify({
      agent_id: requireEnv("ELEVENLABS_AGENT_ID"),
      agent_phone_number_id: agentPhoneNumberId,
      to_number: input.to,
      conversation_initiation_client_data: {
        conversation_config_override: input.firstMessage
          ? { agent: { first_message: input.firstMessage } }
          : undefined,
        dynamic_variables: {
          ...(input.objective ? { call_objective: input.objective } : {}),
          ...(input.dynamicVariables ?? {}),
        },
      },
    }),
  });

  return {
    callSid: String((data as { callSid?: string; call_sid?: string }).callSid ?? (data as { call_sid?: string }).call_sid ?? ""),
    conversationId: String((data as { conversation_id?: string }).conversation_id ?? ""),
    raw: data,
  };
}
