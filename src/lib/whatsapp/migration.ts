/**
 * WhatsApp Migration UX
 * Handles migration of existing WhatsApp numbers to Business API
 */

export interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: string;
}

export interface MigrationProgress {
  phoneNumber: string;
  currentStep: number;
  totalSteps: number;
  steps: MigrationStep[];
  startedAt: string;
  completedAt?: string;
}

/**
 * Get migration steps for a phone number
 */
export function getMigrationSteps(phoneNumber: string): MigrationStep[] {
  return [
    {
      id: "verify_number",
      title: "Verify Phone Number",
      description: "Confirm ownership of the phone number via SMS verification",
      status: "pending",
    },
    {
      id: "create_business_account",
      title: "Create Business Account",
      description: "Set up a Meta Business Account if not already created",
      status: "pending",
    },
    {
      id: "link_number",
      title: "Link Number to Business",
      description: "Connect the phone number to your Meta Business Account",
      status: "pending",
    },
    {
      id: "configure_webhook",
      title: "Configure Webhook",
      description: "Set up webhook URL for receiving messages and status updates",
      status: "pending",
    },
    {
      id: "test_connection",
      title: "Test Connection",
      description: "Send a test message to verify the integration works",
      status: "pending",
    },
    {
      id: "migrate_templates",
      title: "Migrate Templates",
      description: "Review and migrate existing message templates to Business API format",
      status: "pending",
    },
  ];
}

/**
 * Initiate migration for a phone number
 */
export async function initiateMigration(phoneNumber: string): Promise<MigrationProgress> {
  const steps = getMigrationSteps(phoneNumber);
  
  return {
    phoneNumber,
    currentStep: 0,
    totalSteps: steps.length,
    steps,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Execute a migration step
 */
export async function executeMigrationStep(
  phoneNumber: string,
  stepId: string
): Promise<MigrationStep> {
  const step = getMigrationSteps(phoneNumber).find((s) => s.id === stepId);
  if (!step) {
    throw new Error(`Step ${stepId} not found`);
  }

  // Simulate step execution
  // In a real implementation, this would call Meta APIs
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    ...step,
    status: "completed",
  };
}

/**
 * Check if a number is eligible for migration
 */
export function checkMigrationEligibility(phoneNumber: string): {
  eligible: boolean;
  reason?: string;
} {
  // Basic validation
  if (!phoneNumber || phoneNumber.length < 10) {
    return {
      eligible: false,
      reason: "Invalid phone number format",
    };
  }

  // Check if number is already on Business API
  // This would involve checking with Meta API
  // For now, assume eligible
  return {
    eligible: true,
  };
}

/**
 * Get migration requirements
 */
export function getMigrationRequirements(): string[] {
  return [
    "A Meta Business Account (free to create)",
    "Verified phone number ownership",
    "Business display name and profile photo",
    "Business category and description",
    "Business website or Facebook page",
    "Valid business documentation (for some regions)",
  ];
}

/**
 * Estimate migration time
 */
export function estimateMigrationTime(): {
  minHours: number;
  maxHours: number;
  description: string;
} {
  return {
    minHours: 24,
    maxHours: 72,
    description: "Migration typically takes 1-3 business days depending on Meta's review process",
  };
}

/**
 * Get common migration issues and solutions
 */
export function getMigrationIssues(): Array<{
  issue: string;
  solution: string;
}> {
  return [
    {
      issue: "Number already linked to another business",
      solution: "Contact the previous business owner to unlink the number, or use a different number",
    },
    {
      issue: "Verification code not received",
      solution: "Ensure the number can receive SMS and check signal strength. Try requesting a new code",
    },
    {
      issue: "Business account verification failed",
      solution: "Submit additional business documentation and ensure all information is accurate",
    },
    {
      issue: "Webhook URL not responding",
      solution: "Verify your webhook URL is publicly accessible and returns 200 OK",
    },
    {
      issue: "Template rejected",
      solution: "Review Meta's template policies and ensure your template complies with formatting requirements",
    },
  ];
}
