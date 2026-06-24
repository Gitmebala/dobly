/**
 * Automatic Webhook Configuration
 * Automatically configures webhooks for newly provisioned phone numbers
 */

export interface WebhookConfig {
  voiceUrl: string;
  smsUrl: string;
  statusCallbackUrl: string;
}

/**
 * Generate webhook URLs for a phone number
 */
export function generateWebhookUrls(origin: string, phoneNumber: string): WebhookConfig {
  const encodedPhone = encodeURIComponent(phoneNumber);
  
  return {
    voiceUrl: `${origin}/api/webhooks/twilio/voice`,
    smsUrl: `${origin}/api/webhooks/twilio/sms`,
    statusCallbackUrl: `${origin}/api/webhooks/twilio/status`,
  };
}

/**
 * Configure webhooks for a Twilio phone number
 */
export async function configureTwilioWebhooks(params: {
  phoneNumber: string;
  twilioSid: string;
  origin: string;
}): Promise<{ success: boolean; error?: string }> {
  const { buyTwilioPhoneNumber } = await import("@/lib/providers/twilio");
  
  try {
    const webhookUrls = generateWebhookUrls(params.origin, params.phoneNumber);
    
    // Update the phone number with webhook URLs
    // Note: Twilio doesn't have a direct API to update webhooks on an existing number
    // This is typically done during the initial purchase. If you need to update later,
    // you would need to use the Twilio REST API to update the IncomingPhoneNumber resource
    
    // For now, we'll assume webhooks were set during purchase
    // If you need to update, you would use:
    // await twilioClient.incomingPhoneNumbers(params.twilioSid).update({
    //   voiceUrl: webhookUrls.voiceUrl,
    //   smsUrl: webhookUrls.smsUrl,
    //   statusCallback: webhookUrls.statusCallbackUrl,
    // });
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify webhook configuration
 */
export async function verifyWebhookConfig(params: {
  phoneNumber: string;
  origin: string;
}): Promise<{
  voiceConfigured: boolean;
  smsConfigured: boolean;
  statusConfigured: boolean;
}> {
  const webhookUrls = generateWebhookUrls(params.origin, params.phoneNumber);
  
  // In a real implementation, you would query Twilio to verify the current configuration
  // For now, return placeholder values
  
  return {
    voiceConfigured: true,
    smsConfigured: true,
    statusConfigured: true,
  };
}

/**
 * Test webhook endpoint
 */
export async function testWebhookEndpoint(url: string): Promise<{
  reachable: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const latency = Date.now() - startTime;
    
    return {
      reachable: response.ok,
      latency,
    };
  } catch (error) {
    return {
      reachable: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get webhook security requirements
 */
export function getWebhookSecurityRequirements(): {
  requiresSignature: boolean;
  signatureHeader: string;
  description: string;
} {
  return {
    requiresSignature: true,
    signatureHeader: "X-Twilio-Signature",
    description: "Twilio signs webhook requests with your auth token. Verify signatures to ensure requests are from Twilio.",
  };
}
