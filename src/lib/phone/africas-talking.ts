/**
 * Africa's Talking Integration
 * Regional fallback provider for African countries with better local coverage and pricing
 */

export interface AfricaTalkingConfig {
  apiKey: string;
  username: string;
}

export interface AfricaTalkingNumber {
  phoneNumber: string;
  country: string;
  currency: string;
  monthlyCost: number;
  capabilities: string[];
}

function unsupportedProvisioningMessage(country: string) {
  return `Dobly can use Africa's Talking for regional messaging in ${country}, but self-serve phone number search and purchase are not wired to a verified provisioning API yet. Use Twilio provisioning in-app or connect an existing Africa's Talking sender first.`;
}

/**
 * Get Africa's Talking configuration from environment
 */
export function getAfricaTalkingConfig(): AfricaTalkingConfig | null {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  
  if (!apiKey || !username) {
    return null;
  }

  return {
    apiKey,
    username,
  };
}

/**
 * Check if a country should use Africa's Talking instead of Twilio
 */
export function shouldUseAfricaTalking(country: string): boolean {
  const africanCountries = [
    "KE", // Kenya
    "UG", // Uganda
    "TZ", // Tanzania
    "RW", // Rwanda
    "NG", // Nigeria
    "ZA", // South Africa
    "GH", // Ghana
    "CI", // Ivory Coast
    "SN", // Senegal
    "MZ", // Mozambique
    "ET", // Ethiopia
    "ZM", // Zambia
    "ZW", // Zimbabwe
    "MW", // Malawi
    "SO", // Somalia
  ];

  return africanCountries.includes(country);
}

/**
 * Search for available phone numbers via Africa's Talking
 */
export async function searchAfricaTalkingNumbers(params: {
  country: string;
  quantity?: number;
}): Promise<AfricaTalkingNumber[]> {
  const config = getAfricaTalkingConfig();
  if (!config) {
    throw new Error("Africa's Talking is not configured");
  }

  void config;
  void params.quantity;
  throw new Error(unsupportedProvisioningMessage(params.country));
}

/**
 * Purchase a phone number via Africa's Talking
 */
export async function buyAfricaTalkingNumber(params: {
  phoneNumber: string;
  country: string;
}): Promise<{
  success: boolean;
  phoneNumber: string;
  error?: string;
}> {
  const config = getAfricaTalkingConfig();
  if (!config) {
    throw new Error("Africa's Talking is not configured");
  }

  void config;
  return {
    success: false,
    phoneNumber: params.phoneNumber,
    error: unsupportedProvisioningMessage(params.country),
  };
}

/**
 * Send SMS via Africa's Talking
 */
export async function sendAfricaTalkingSMS(params: {
  to: string;
  message: string;
  from?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const config = getAfricaTalkingConfig();
  if (!config) {
    throw new Error("Africa's Talking is not configured");
  }

  const url = `https://api.africastalking.com/version1/messaging`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      apiKey: config.apiKey,
    },
    body: new URLSearchParams({
      username: config.username,
      to: params.to,
      message: params.message,
      from: params.from || "",
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: response.statusText,
    };
  }

  const data = await response.json();
  
  return {
    success: true,
    messageId: data.SMSMessageData?.Recipients?.[0]?.messageId,
  };
}

/**
 * Get pricing for Africa's Talking
 */
export function getAfricaTalkingPricing(country: string): {
  smsCost: number;
  voiceCost: number;
  currency: string;
} {
  // Simplified pricing - actual implementation would fetch from their API
  const pricing: Record<string, { sms: number; voice: number; currency: string }> = {
    KE: { sms: 0.001, voice: 0.005, currency: "KES" },
    UG: { sms: 0.0015, voice: 0.006, currency: "UGX" },
    TZ: { sms: 0.002, voice: 0.007, currency: "TZS" },
    NG: { sms: 0.0025, voice: 0.008, currency: "NGN" },
    ZA: { sms: 0.003, voice: 0.01, currency: "ZAR" },
  };

  const countryPricing = pricing[country] || { sms: 0.001, voice: 0.005, currency: "USD" };

  return {
    smsCost: countryPricing.sms,
    voiceCost: countryPricing.voice,
    currency: countryPricing.currency,
  };
}

/**
 * Compare pricing between Twilio and Africa's Talking
 */
export function compareProviders(country: string): {
  recommended: "twilio" | "africas_talking";
  twilioCost: number;
  africaTalkingCost: number;
  savings: number;
  reason: string;
} {
  const africaTalkingPricing = getAfricaTalkingPricing(country);
  const twilioPricing = {
    smsCost: 0.01, // Simplified Twilio pricing
    voiceCost: 0.02,
  };

  const africaTalkingTotal = africaTalkingPricing.smsCost + africaTalkingPricing.voiceCost;
  const twilioTotal = twilioPricing.smsCost + twilioPricing.voiceCost;

  if (shouldUseAfricaTalking(country)) {
    const savings = twilioTotal - africaTalkingTotal;
    return {
      recommended: "africas_talking",
      twilioCost: twilioTotal,
      africaTalkingCost: africaTalkingTotal,
      savings,
      reason: `Africa's Talking offers better coverage and pricing for ${country}`,
    };
  }

  return {
    recommended: "twilio",
    twilioCost: twilioTotal,
    africaTalkingCost: africaTalkingTotal,
    savings: 0,
    reason: "Twilio is recommended for this region",
  };
}
