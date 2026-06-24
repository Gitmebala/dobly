import { buyTwilioPhoneNumber } from "@/lib/providers/twilio";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * One-Click Phone Number Provisioning with Billing Setup
 */

export interface ProvisioningParams {
  phoneNumber: string;
  userId: string;
  workspaceId: string;
  friendlyName?: string;
  deployAgent?: boolean;
  agentType?: "reception" | "sales" | "support";
}

export interface ProvisioningResult {
  success: boolean;
  phoneNumber: string;
  twilioSid?: string;
  connectionId?: string;
  agentId?: string;
  error?: string;
}

/**
 * Provision a phone number with automatic billing and agent deployment
 */
export async function provisionPhoneNumber(params: ProvisioningParams): Promise<ProvisioningResult> {
  const admin = createAdminSupabaseClient();
  const origin = process.env.APP_URL || "http://localhost:3000";
  
  try {
    // Step 1: Purchase the number from Twilio
    const twilioResult = await buyTwilioPhoneNumber({
      phoneNumber: params.phoneNumber,
      friendlyName: params.friendlyName || "Dobly Business Number",
      voiceUrl: `${origin}/api/webhooks/twilio/voice`,
      smsUrl: `${origin}/api/webhooks/twilio/sms`,
    });

    // Step 2: Create connection record in database
    const { data: connection, error: connectionError } = await admin
      .from("connections")
      .insert({
        user_id: params.userId,
        workspace_id: params.workspaceId,
        provider: "twilio",
        channel_type: "phone",
        identifier: params.phoneNumber,
        config: {
          twilio_sid: twilioResult.sid,
          friendly_name: twilioResult.friendly_name,
          voice_url: `${origin}/api/webhooks/twilio/voice`,
          sms_url: `${origin}/api/webhooks/twilio/sms`,
        },
        status: "active",
        metadata: {
          purchased_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (connectionError) {
      throw new Error(`Failed to create connection: ${connectionError.message}`);
    }

    // Step 3: Deploy agent if requested
    let agentId: string | undefined;
    if (params.deployAgent) {
      const { data: agent, error: agentError } = await admin
        .from("coworkers")
        .insert({
          user_id: params.userId,
          workspace_id: params.workspaceId,
          name: `${params.friendlyName || "Phone"} Agent`,
          desk: `${params.agentType || "reception"}_desk`,
          mission: `Handle incoming calls and messages for ${params.phoneNumber}`,
          tools: ["whatsapp", "voice", "calendar"],
          permissions: ["send_messages", "make_calls", "schedule"],
          runtime_kind: "bot",
          status: "active",
          config: {
            phone_connection_id: connection.id,
            phone_number: params.phoneNumber,
          },
        })
        .select("id")
        .single();

      if (agentError) {
        console.error("Failed to deploy agent:", agentError);
      } else {
        agentId = agent.id;
      }
    }

    return {
      success: true,
      phoneNumber: params.phoneNumber,
      twilioSid: twilioResult.sid,
      connectionId: connection.id,
      agentId,
    };
  } catch (error) {
    return {
      success: false,
      phoneNumber: params.phoneNumber,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Calculate estimated monthly cost for a phone number
 */
export function estimateMonthlyCost(country: string): {
  monthlyFee: number;
  usageFee: number;
  currency: string;
  description: string;
} {
  // Twilio pricing (simplified)
  const pricing: Record<string, { monthly: number; usage: number }> = {
    US: { monthly: 1.0, usage: 0.01 },
    GB: { monthly: 1.5, usage: 0.02 },
    KE: { monthly: 2.0, usage: 0.05 },
    CA: { monthly: 1.2, usage: 0.015 },
    AU: { monthly: 1.5, usage: 0.02 },
  };

  const countryPricing = pricing[country] || { monthly: 1.0, usage: 0.01 };

  return {
    monthlyFee: countryPricing.monthly,
    usageFee: countryPricing.usage,
    currency: "USD",
    description: `Monthly fee: $${countryPricing.monthly.toFixed(2)} + $${countryPricing.usage.toFixed(2)}/minute for calls`,
  };
}

/**
 * Check if user has billing setup for phone numbers
 */
export async function checkBillingSetup(userId: string): Promise<{
  hasBilling: boolean;
  paymentMethodId?: string;
}> {
  const admin = createAdminSupabaseClient();

  const { data: billing } = await admin
    .from("billing_accounts")
    .select("payment_method_id")
    .eq("user_id", userId)
    .single();

  return {
    hasBilling: !!billing,
    paymentMethodId: billing?.payment_method_id,
  };
}

/**
 * Setup billing for phone number provisioning
 */
export async function setupBilling(params: {
  userId: string;
  paymentMethodId: string;
}): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminSupabaseClient();

  const { error } = await admin
    .from("billing_accounts")
    .upsert({
      user_id: params.userId,
      payment_method_id: params.paymentMethodId,
      status: "active",
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}
