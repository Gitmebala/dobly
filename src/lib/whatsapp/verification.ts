/**
 * E2E Template Verification
 * Verifies end-to-end template functionality including delivery and read receipts
 */

import { createAdminSupabaseClient } from "@/lib/supabase/server";

export interface VerificationResult {
  success: boolean;
  messageId: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureReason?: string;
  latency?: number;
}

export interface VerificationTest {
  templateName: string;
  testNumber: string;
  variables?: Record<string, string>;
  expectedDelivery: boolean;
  expectedRead: boolean;
}

/**
 * Send a test message for template verification
 */
export async function sendTestMessage(params: VerificationTest): Promise<VerificationResult> {
  const { sendTemplateMessage } = await import("./templates");
  
  const startTime = Date.now();
  
  try {
    const result = await sendTemplateMessage(
      params.testNumber,
      params.templateName,
      params.variables ? Object.entries(params.variables).map(([key, value]) => ({
        type: "text",
        text: value,
      })) : undefined
    );

    return {
      success: true,
      messageId: result.messageId || "",
      sentAt: new Date().toISOString(),
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      messageId: "",
      sentAt: new Date().toISOString(),
      failedAt: new Date().toISOString(),
      failureReason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Poll for message delivery status
 */
export async function checkDeliveryStatus(messageId: string): Promise<{
  delivered: boolean;
  read: boolean;
  deliveredAt?: string;
  readAt?: string;
}> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("communication_messages")
    .select("status, metadata, updated_at")
    .eq("provider_message_id", messageId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      delivered: false,
      read: false,
    };
  }

  const metadata = ((data as any).metadata ?? {}) as Record<string, unknown>;
  const deliveryStatus = String(metadata.delivery_status ?? (data as any).status ?? "").toLowerCase();
  const statusAt =
    typeof metadata.delivery_status_at === "string"
      ? metadata.delivery_status_at
      : typeof (data as any).updated_at === "string"
        ? (data as any).updated_at
        : undefined;

  return {
    delivered: deliveryStatus === "delivered" || deliveryStatus === "read" || deliveryStatus === "sent",
    read: deliveryStatus === "read",
    deliveredAt: deliveryStatus === "delivered" || deliveryStatus === "read" || deliveryStatus === "sent" ? statusAt : undefined,
    readAt: deliveryStatus === "read" ? statusAt : undefined,
  };
}

/**
 * Run full E2E verification for a template
 */
export async function runE2EVerification(params: {
  templateName: string;
  testNumber: string;
  variables?: Record<string, string>;
  timeoutMs?: number;
}): Promise<{
  success: boolean;
  steps: Array<{
    step: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    timestamp: string;
    error?: string;
  }>;
  result: VerificationResult;
}> {
  const timeout = params.timeoutMs || 30000; // 30 seconds default
  const startTime = Date.now();
  const steps: Array<{
    step: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    timestamp: string;
    error?: string;
  }> = [
    {
      step: "send_message",
      status: "pending",
      timestamp: new Date().toISOString(),
    },
    {
      step: "wait_for_delivery",
      status: "pending",
      timestamp: new Date().toISOString(),
    },
    {
      step: "wait_for_read",
      status: "pending",
      timestamp: new Date().toISOString(),
    },
  ];

  // Step 1: Send message
  steps[0].status = "in_progress";
  const sendResult = await sendTestMessage({
    templateName: params.templateName,
    testNumber: params.testNumber,
    variables: params.variables,
    expectedDelivery: true,
    expectedRead: true,
  });

  if (!sendResult.success) {
    steps[0].status = "failed";
    steps[0].error = sendResult.failureReason;
    return {
      success: false,
      steps,
      result: sendResult,
    };
  }

  steps[0].status = "completed";

  // Step 2: Wait for delivery
  steps[1].status = "in_progress";
  let delivered = false;
  let deliveredAt: string | undefined;

  while (Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2 seconds
    
    const status = await checkDeliveryStatus(sendResult.messageId);
    if (status.delivered) {
      delivered = true;
      deliveredAt = status.deliveredAt || new Date().toISOString();
      break;
    }
  }

  if (!delivered) {
    steps[1].status = "failed";
    steps[1].error = "Message not delivered within timeout";
    return {
      success: false,
      steps,
      result: {
        ...sendResult,
        deliveredAt,
      },
    };
  }

  steps[1].status = "completed";

  // Step 3: Wait for read (optional)
  steps[2].status = "in_progress";
  let read = false;
  let readAt: string | undefined;

  while (Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const status = await checkDeliveryStatus(sendResult.messageId);
    if (status.read) {
      read = true;
      readAt = status.readAt || new Date().toISOString();
      break;
    }
  }

  if (!read) {
    steps[2].status = "failed";
    steps[2].error = "Message not read within timeout (this may be normal if test number is not monitored)";
    // Read receipt is optional, so we still consider it a success
  } else {
    steps[2].status = "completed";
  }

  return {
    success: true,
    steps,
    result: {
      ...sendResult,
      deliveredAt,
      readAt,
    },
  };
}

/**
 * Verify template compliance with Meta policies
 */
export function verifyTemplateCompliance(template: {
  name: string;
  category: string;
  components: Array<{ type: string; text?: string }>;
}): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check name format
  if (!/^[a-z0-9_]+$/.test(template.name)) {
    issues.push("Template name must only contain lowercase letters, numbers, and underscores");
  }

  if (template.name.length > 512) {
    issues.push("Template name must be 512 characters or less");
  }

  // Check for required components
  const hasBody = template.components.some((c) => c.type === "BODY");
  if (!hasBody) {
    issues.push("Template must have a BODY component");
  }

  // Check body length
  const bodyComponent = template.components.find((c) => c.type === "BODY");
  if (bodyComponent && bodyComponent.text && bodyComponent.text.length > 1024) {
    issues.push("Template body must be 1024 characters or less");
  }

  // Check category-specific requirements
  if (template.category === "AUTHENTICATION") {
    const hasButtons = template.components.some((c) => c.type === "BUTTONS");
    if (!hasButtons) {
      issues.push("Authentication templates must have buttons (OTP copy button)");
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

/**
 * Get verification recommendations
 */
export function getVerificationRecommendations(): string[] {
  return [
    "Use a test phone number that you actively monitor for quick verification",
    "Test with different variable values to ensure template flexibility",
    "Verify delivery within 24 hours of template approval",
    "Check delivery rates across different regions if you serve multiple countries",
    "Monitor read rates to assess message engagement",
    "Test both marketing and utility templates separately",
  ];
}
