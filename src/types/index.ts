export type PlanId = "free" | "starter" | "pro" | "agency";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  workflows_generated: number;
  notification_preference?: "app" | "email" | "whatsapp" | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string | null;
  website_url: string | null;
  description: string | null;
  locations: string[];
  opening_hours: string | null;
  contact_details: Record<string, unknown>;
  brand_voice: string | null;
  faq_entries: Array<{ question: string; answer: string }>;
  policies: string[];
  source_urls: string[];
  context_summary: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkflowStatus = "active" | "paused" | "draft";
export type WorkflowRunStatus = "success" | "failed" | "running" | "awaiting_approval";
export type TriggerType = "manual" | "webhook" | "schedule";
export type WorkflowActionType =
  | "compose_text"
  | "send_email"
  | "webhook_request"
  | "delay"
  | "branch"
  | "skill"
  | "file_write"
  | "orchestrate_document";

export type WorkflowExecutionType = "standard" | "intelligence";

export interface Workflow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  prompt: string;
  blueprint: WorkflowBlueprint;
  status: WorkflowStatus;
  runs_count: number;
  time_saved_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  tool: string;
  tool_logo?: string;
  action: string;
  config: Record<string, unknown>;
  output?: string;
}

export interface WorkflowTrigger {
  type: TriggerType;
  label: string;
  schedule?: string;
  webhook_path?: string;
  config?: Record<string, unknown>;
}

export type WorkflowOperatorAutonomy = "supervised" | "guarded" | "delegated";
export type WorkflowOperatorMode = "workflow" | "bounded_operator";

// Agent-specific types
export interface ConversationNode {
  id: string;
  type: "greeting" | "question" | "decision" | "action" | "handoff" | "end";
  text: string;
  nextNode?: string;
  branches?: ConversationBranch[];
  actionType?: string;
  actionConfig?: Record<string, unknown>;
}

export interface ConversationBranch {
  condition: string;
  targetNodeId: string;
}

export interface EscalationTrigger {
  type: "confidence_below" | "keyword_match" | "call_duration_exceeded" | "repeated_misunderstanding";
  threshold?: number;
  keywords?: string[];
  seconds?: number;
  count?: number;
}

export interface AgentConfig {
  // Prompt & Behavior
  systemPrompt: string;
  conversationTone: "professional" | "friendly" | "empathetic" | "formal";
  behaviorRules: string[];
  maxResponseLength: number;
  knowledgeBase?: string;

  // Voice Configuration
  voiceProvider: "google" | "eleven-labs" | "azure" | "aws";
  voiceId: string;
  language: string;
  accent?: string;
  speechRate: number;
  pitch: number;

  // Conversation Flow
  conversationFlow: ConversationNode[];
  maxTurnCount: number;
  silenceTimeoutSeconds: number;

  // Call Actions
  callActions: {
    beforeCall: {
      fetchContext: string;
      announceCallerName: boolean;
      playHoldingMessage: boolean;
    };
    duringCall: {
      allowTransfers: boolean;
      transferPhoneNumber?: string;
      pauseForConfirmation: string[];
    };
    afterCall: {
      recordTranscript: boolean;
      sendEmail: string[];
      webhookUrl: string;
      scheduleFollowup: boolean;
      followupDelayMinutes: number;
    };
  };

  // Calendar Integration
  calendarIntegration?: {
    provider: "google" | "microsoft" | "calendly" | "slack";
    enabled: boolean;
    checkAvailability: boolean;
    autoBook: boolean;
    calendarIds: string[];
    bufferMinutes: number;
    timezone: string;
    businessHours: {
      monday: { start: string; end: string } | null;
      tuesday: { start: string; end: string } | null;
      wednesday: { start: string; end: string } | null;
      thursday: { start: string; end: string } | null;
      friday: { start: string; end: string } | null;
      saturday: { start: string; end: string } | null;
      sunday: { start: string; end: string } | null;
    };
  };

  // Escalation & Handoff
  escalation: {
    triggers: EscalationTrigger[];
    handoffMessage: string;
    handoffPhoneNumber?: string;
    handoffEmail?: string;
    escalationQueue?: "round_robin" | "first_available" | "skill_based";
    maxWaitTime: number;
  };

  // Integrations (CRM, Data)
  integrations: {
    crm?: {
      provider: "salesforce" | "hubspot" | "pipedrive";
      syncOnCall: boolean;
      createLead: boolean;
      updateContact: boolean;
    };
    dataConnections: Array<{
      connectionId: string;
      syncField: string;
      syncDirection: "read" | "write" | "bidirectional";
    }>;
  };

  // Deployment
  deployment: {
    channels: Array<"voice" | "whatsapp" | "sms" | "web" | "api">;
    voiceChannelConfig?: {
      phoneNumber: string;
      provider: "twilio" | "vonage" | "bandwidth";
    };
    webChannelConfig?: {
      embedUrl: string;
      widgetTheme: "light" | "dark";
    };
    apiConfig?: {
      webhookSecret: string;
      rateLimit: number;
    };
  };

  // Monitoring & Analytics
  monitoring: {
    recordCalls: boolean;
    transcriptSentiment: boolean;
    keywords: string[];
    reportingEmail: string[];
  };
}

export interface WorkflowOperator {
  enabled: boolean;
  mode: WorkflowOperatorMode;
  role: string;
  objective: string;
  channel?: string;
  autonomy: WorkflowOperatorAutonomy;
  approvalRiskThreshold: "medium" | "high";
  allowedDomains: string[];
  escalationMessage?: string;
  agentConfig?: AgentConfig;
}

export interface WorkflowActionStep {
  id: string;
  name: string;
  description: string;
  app: string;
  actionType: WorkflowActionType;
  executionType?: WorkflowExecutionType;
  skillKey?: string | null;
  lane?: "native" | "generic";
  connectorId?: string;
  connectorActionId?: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  version: number;
  trigger: WorkflowTrigger;
  operator?: WorkflowOperator;
  steps: WorkflowActionStep[];
}

export interface WorkflowBlueprint {
  name: string;
  description: string;
  trigger: string;
  category: WorkflowCategory;
  steps: WorkflowStep[];
  estimated_time_saved: string;
  difficulty: "Simple" | "Moderate" | "Complex";
  integrations: string[];
  setup_steps: string[];
  definition?: WorkflowDefinition;
}

export interface WorkflowRunStep {
  id: string;
  name: string;
  status: Exclude<WorkflowRunStatus, "running">;
  started_at: string;
  finished_at: string;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: WorkflowRunStatus;
  trigger_type: TriggerType;
  trigger_payload: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  step_results: WorkflowRunStep[];
}

export interface WorkflowRunEvent {
  id: string;
  workflow_id: string;
  run_id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  user_id: string;
  version_number: number;
  title: string;
  description: string;
  blueprint: WorkflowBlueprint;
  status: "draft" | "published" | "archived";
  created_at: string;
}

export interface Connection {
  id: string;
  user_id: string;
  provider: string;
  label: string;
  status: "pending" | "active" | "expired" | "error";
  account_identifier: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ConnectionVerificationChannel = "whatsapp" | "email";
export type ConnectionVerificationType = "otp" | "email_link";
export type ConnectionVerificationStatus = "pending" | "verified" | "expired" | "cancelled";

export interface ConnectionVerification {
  id: string;
  user_id: string;
  connection_id: string;
  provider: string;
  channel: ConnectionVerificationChannel;
  verification_type: ConnectionVerificationType;
  destination: string;
  code_hash: string | null;
  token_hash: string | null;
  status: ConnectionVerificationStatus;
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConnectionSecret {
  id: string;
  connection_id: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  encrypted_secret: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueJob {
  id: string;
  type: string;
  workflow_id: string | null;
  run_id: string | null;
  user_id: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
  priority: number;
  attempts: number;
  max_attempts: number;
  available_at: string;
  locked_by: string | null;
  locked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkflowCategory =
  | "Customer Communication"
  | "Sales & Marketing"
  | "Finance & Invoicing"
  | "Social Media"
  | "E-commerce"
  | "Productivity"
  | "Life & Personal Admin"
  | "Data & Reporting"
  | "HR & Operations"
  | "Other";

export interface Plan {
  id: PlanId;
  name: string;
  price_kes: number | null;
  price_usd: number | null;
  stripe_price_id: string | null;
  max_workflows: number;
  max_standard_executions: number;
  max_intelligence_actions: number;
  standard_execution_overage_label?: string;
  intelligence_overage_label?: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

export type WorkflowHealthStatus = "green" | "amber" | "red";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type ApprovalChannel = "app" | "email" | "whatsapp";

export interface Approval {
  id: string;
  workflow_id: string;
  user_id: string;
  run_id: string | null;
  title: string;
  message: string;
  action_label: string | null;
  risk_level: "low" | "medium" | "high";
  channel: ApprovalChannel;
  status: ApprovalStatus;
  metadata: Record<string, unknown>;
  requested_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

export interface PlanUsageSnapshot {
  plan_id: PlanId;
  workflow_count: number;
  standard_executions_used: number;
  standard_executions_limit: number;
  intelligence_actions_used: number;
  intelligence_actions_limit: number;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price_kes: 0,
    price_usd: 0,
    stripe_price_id: null,
    max_workflows: 3,
    max_standard_executions: 200,
    max_intelligence_actions: 10,
    features: [
      "3 active workflows",
      "200 standard executions / month",
      "10 intelligence actions / month",
      "All core integrations",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price_kes: 999,
    price_usd: null,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? null,
    max_workflows: 20,
    max_standard_executions: 1500,
    max_intelligence_actions: 50,
    standard_execution_overage_label: "KES 3 / extra 100 standard executions",
    intelligence_overage_label: "KES 5 / extra intelligence action",
    features: [
      "20 active workflows",
      "1,500 standard executions / month",
      "50 intelligence actions / month",
      "Approval alerts and connection recovery",
      "Personal and business automations",
    ],
    badge: "Best for getting started",
  },
  {
    id: "pro",
    name: "Pro",
    price_kes: null,
    price_usd: 19,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? null,
    max_workflows: 100,
    max_standard_executions: 8000,
    max_intelligence_actions: 200,
    standard_execution_overage_label: "$0.50 / extra 1,000 standard executions",
    intelligence_overage_label: "$0.05 / extra intelligence action",
    features: [
      "100 active workflows",
      "8,000 standard executions / month",
      "200 intelligence actions / month",
      "API access and webhooks",
      "All integrations",
    ],
    highlight: true,
    badge: "Most popular",
  },
  {
    id: "agency",
    name: "Agency",
    price_kes: null,
    price_usd: 49,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID ?? null,
    max_workflows: -1,
    max_standard_executions: 40000,
    max_intelligence_actions: 1000,
    standard_execution_overage_label: "$0.40 / extra 1,000 standard executions",
    intelligence_overage_label: "$0.03 / extra intelligence action",
    features: [
      "Unlimited active workflows",
      "40,000 standard executions / month",
      "1,000 intelligence actions / month",
      "Client workspaces",
      "White-label options",
      "Template deployment across clients",
      "Read-only client dashboards",
      "Dedicated support",
    ],
    badge: "For agencies",
  },
];

export const PLAN_LIMITS: Record<PlanId, number> = {
  free: 3,
  starter: 20,
  pro: 100,
  agency: -1,
};

export interface GenerateWorkflowRequest {
  prompt: string;
}

export interface GenerateWorkflowResponse {
  workflow: WorkflowBlueprint;
  workflow_id: string;
  missing_providers?: string[];
  connection_strategy?: {
    likely_category: WorkflowCategory;
    required_provider_ids: string[];
    optional_provider_ids: string[];
    managed_capability_ids: string[];
  };
  next_url?: string | null;
}

export interface ApiError {
  error: string;
  code?: string;
}
