import "server-only";

export type RuntimeProviderStatus = "ready" | "missing" | "partial";

export interface RuntimeProviderHealth {
  id: string;
  label: string;
  status: RuntimeProviderStatus;
  requiredEnv: string[];
  missingEnv: string[];
  capability: string;
}

function provider(id: string, label: string, requiredEnv: string[], capability: string): RuntimeProviderHealth {
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  return {
    id,
    label,
    requiredEnv,
    missingEnv,
    status: missingEnv.length === 0 ? "ready" : "missing",
    capability,
  };
}

export function getRuntimeProviderHealth(): RuntimeProviderHealth[] {
  return [
    {
      id: "dobly_web",
      label: "Dobly Direct Research",
      status: "ready",
      requiredEnv: [],
      missingEnv: [],
      capability: "Direct public-source research without a prepaid search provider.",
    },
    {
      id: "pgvector",
      label: "PostgreSQL Memory",
      status: "ready",
      requiredEnv: [],
      missingEnv: [],
      capability: "Durable memory and the pgvector semantic retrieval path.",
    },
    provider("intasend", "IntaSend Kenya Checkout", ["INTASEND_PUBLISHABLE_KEY", "INTASEND_SECRET_KEY"], "Kenya-first hosted M-Pesa and card checkout."),
    provider("mpesa_billing", "Managed M-Pesa Billing", ["DOBLY_MPESA_CONSUMER_KEY", "DOBLY_MPESA_CONSUMER_SECRET", "DOBLY_MPESA_PASSKEY", "DOBLY_MPESA_SHORTCODE", "DOBLY_MPESA_CALLBACK_URL"], "One-tap STK subscription payments and renewal requests."),
    provider("perplexity", "Perplexity Research", ["PERPLEXITY_API_KEY"], "Fresh web research and cited answers."),
    provider("firecrawl", "Firecrawl Web Extraction", ["FIRECRAWL_API_KEY"], "Website crawling, scraping, and source extraction."),
    provider("elevenlabs", "ElevenLabs Voice", ["ELEVENLABS_API_KEY"], "Voice synthesis and voice-agent audio."),
    provider("kenya_sms", "Kenya Local SMS", ["KENYA_SMS_API_URL", "KENYA_SMS_API_KEY"], "Local Kenya SMS delivery for Dobly replies and verification codes."),
    provider("africas_talking", "Africa's Talking Voice", ["AFRICASTALKING_API_KEY", "AFRICASTALKING_USERNAME"], "Kenya phone number and voice transport for Reception."),
    provider("twilio", "Twilio International Fallback", ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"], "International phone, SMS, and voice fallback."),
    provider("openai", "OpenAI Media and Synthesis", ["OPENAI_API_KEY"], "Image/media generation and structured synthesis."),
    provider("meta", "Meta Social Publishing", ["META_APP_ID", "META_APP_SECRET"], "Instagram, Facebook, and WhatsApp publishing surfaces."),
  ];
}

export function requireRuntimeProvider(providerId: string) {
  const health = getRuntimeProviderHealth().find((item) => item.id === providerId);
  if (!health) {
    throw new Error(`Unknown runtime provider: ${providerId}`);
  }
  if (health.status !== "ready") {
    throw new Error(`${health.label} is not configured. Missing: ${health.missingEnv.join(", ")}`);
  }
  return health;
}
