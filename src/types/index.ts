export type PlanId = "free" | "starter" | "operator" | "command" | "business";

// ============================================================
// COWORKER BUILDER TYPES
// ============================================================

export type CoworkerRole = 
  | "reception" 
  | "collections" 
  | "support" 
  | "growth_research" 
  | "operations_coordinator";

export type CoworkerDesk = 
  | "customer_desk" 
  | "finance_desk" 
  | "support_desk" 
  | "operations_desk";

export type CoworkerTone = 
  | "professional" 
  | "casual" 
  | "formal" 
  | "warm";

export type CoworkerAutonomyLevel = 
  | "supervised" 
  | "guarded" 
  | "delegated";

export type CoworkerDeploymentState = 
  | "draft" 
  | "simulated" 
  | "shadow" 
  | "guarded_live" 
  | "delegated_live";

export interface LegacyCoworker {
  id: string;
  user_id: string;
  business_profile_id: string | null;
  
  // Core identity
  role: CoworkerRole;
  name: string;
  mission: string;
  description: string | null;
  
  // Desk assignment
  desk: CoworkerDesk;
  desk_scope: Record<string, unknown>;
  
  // Standards and behavior
  standards: Record<string, unknown>;
  tone: CoworkerTone;
  personality: Record<string, unknown>;
  
  // Memory and context
  memory_scope: Record<string, unknown>;
  context_bindings: Record<string, unknown>;
  
  // Permissions and boundaries
  permissions: Record<string, unknown>;
  approval_boundaries: Record<string, unknown>;
  escalation_rules: Record<string, unknown>;
  
  // Tools and capabilities
  tools: string[];
  tool_permissions: Record<string, unknown>;
  
  // Success metrics
  success_metrics: Record<string, unknown>;
  target_outcomes: string[];
  
  // Operating parameters
  operating_hours: Record<string, unknown>;
  autonomy_level: CoworkerAutonomyLevel;
  
  // Deployment state
  deployment_state: CoworkerDeploymentState;
  deployment_stage: Record<string, unknown>;
  
  // Learning and improvement
  learning_loop: Record<string, unknown>;
  version: number;
  
  // Status
  status: CoworkerStatus;
  health_score: number;  // 0.00 to 1.00
  trust_score: number;  // 0.00 to 1.00
  value_score: number;  // 0.00 to 1.00
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_deployed_at: string | null;
  last_health_check: string | null;
}

export type StandardCategory = 
  | "response_time" 
  | "quality" 
  | "escalation" 
  | "communication" 
  | "payment";

export type EnforcementMode = 
  | "soft" 
  | "hard" 
  | "monitor";

export interface Standard {
  id: string;
  user_id: string;
  coworker_id: string | null;
  
  // Standard definition
  name: string;
  description: string | null;
  category: StandardCategory;
  promise: string;
  
  // Measurement
  metric: string;
  target_value: number;
  unit: string | null;
  
  // Conditions
  applies_to: Record<string, unknown>;
  exceptions: Record<string, unknown>;
  
  // Enforcement
  enforcement_mode: EnforcementMode;
  escalation_threshold: Record<string, unknown>;
  
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SpecType = 
  | "deterministic" 
  | "hybrid" 
  | "agent"
  | "pipeline";

export interface OperatingSpec {
  id: string;
  coworker_id: string;
  version: number;
  
  // Compiled spec
  spec_type: SpecType;
  spec: Record<string, unknown>;
  
  // Path breakdown
  deterministic_paths: Record<string, unknown>[];
  agent_nodes: Record<string, unknown>[];
  fallback_paths: Record<string, unknown>[];
  
  // Execution config
  retry_policy: Record<string, unknown>;
  timeout_config: Record<string, unknown>;
  checkpoint_config: Record<string, unknown>;
  
  // Observation hooks
  observation_hooks: Record<string, unknown>[];
  memory_writes: Record<string, unknown>[];
  
  // Validation
  is_valid: boolean;
  validation_errors: Record<string, unknown>[];
  
  // Metadata
  created_at: string;
  created_by_prompt: string | null;
  is_current: boolean;
}

export type ScenarioType = 
  | "common" 
  | "hard" 
  | "custom" 
  | "edge_case";

export type SimulationOutcome = 
  | "success" 
  | "failure" 
  | "escalation" 
  | "uncertain";

export type RiskLevel = 
  | "low" 
  | "medium" 
  | "high";

export interface Simulation {
  id: string;
  coworker_id: string;
  operating_spec_id: string | null;
  
  // Scenario
  scenario_name: string;
  scenario_type: ScenarioType;
  scenario_input: Record<string, unknown>;
  
  // Simulation result
  actions_taken: Record<string, unknown>[];
  decisions_made: Record<string, unknown>[];
  tools_used: Record<string, unknown>[];
  
  // Assessment
  outcome: SimulationOutcome;
  confidence: number;  // 0.00 to 1.00
  risk_level: RiskLevel | null;
  
  // Strengths and weaknesses
  strengths: Record<string, unknown>[];
  weaknesses: Record<string, unknown>[];
  escalation_points: Record<string, unknown>[];
  
  // Metadata
  created_at: string;
  created_by: string | null;
}

export interface ShadowModeRun {
  id: string;
  coworker_id: string;
  
  // Input
  event_type: string;
  event_data: Record<string, unknown>;
  
  // What Dobly would have done
  proposed_action: Record<string, unknown>;
  proposed_message: string;
  reasoning: string;
  
  // Owner comparison
  owner_action: Record<string, unknown> | null;
  owner_approved: boolean | null;
  owner_feedback: string | null;
  
  // Learning
  was_correct: boolean | null;
  learning_signal: Record<string, unknown> | null;
  
  // Metadata
  created_at: string;
}

export type HealthState = 
  | "learning" 
  | "reliable" 
  | "needs_review" 
  | "over_escalating" 
  | "under_escalating" 
  | "underperforming";

export interface CoworkerHealth {
  id: string;
  coworker_id: string;
  
  // Scores
  autonomy_score: number;  // 0.00 to 1.00
  trust_score: number;  // 0.00 to 1.00
  quality_score: number;  // 0.00 to 1.00
  value_score: number;  // 0.00 to 1.00
  
  // Metrics
  response_speed: number;  // average in seconds
  resolution_rate: number;  // percentage
  escalation_rate: number;  // percentage
  override_rate: number;  // percentage
  conversion_rate: number;  // percentage
  
  // Business outcomes
  revenue_captured: number;
  revenue_recovered: number;
  time_saved_hours: number;
  
  // Issues
  recent_mistakes: Record<string, unknown>[];
  top_improvements: Record<string, unknown>[];
  
  // Health state
  health_state: HealthState;
  
  // Metadata
  period_start: string;
  period_end: string;
  created_at: string;
}

export type BriefingType = 
  | "morning" 
  | "evening" 
  | "risk_digest" 
  | "opportunity" 
  | "weekly_summary";

export interface Briefing {
  id: string;
  user_id: string;
  
  // Briefing type
  briefing_type: BriefingType;
  
  // Content
  business_status: string;
  what_happened: Record<string, unknown>[];
  what_matters: Record<string, unknown>[];
  what_changed: Record<string, unknown>[];
  dobly_recommendations: Record<string, unknown>[];
  needs_decision: Record<string, unknown>[];
  opportunities: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  
  // Metrics summary
  metrics_summary: Record<string, unknown>;
  
  // Metadata
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  read_at: string | null;
}

export type SignalType = 
  | "churn_risk" 
  | "demand_signal" 
  | "supplier_issue" 
  | "quality_issue" 
  | "collections_gap" 
  | "unusual_pattern" 
  | "growth_opportunity";

export type ImpactLevel = 
  | "low" 
  | "medium" 
  | "high" 
  | "critical";

export type SignalActionType = 
  | "review" 
  | "approve" 
  | "investigate" 
  | "ignore";

export type SignalStatus = 
  | "new" 
  | "acknowledged" 
  | "in_progress" 
  | "resolved" 
  | "dismissed";

export interface Signal {
  id: string;
  user_id: string;
  coworker_id: string | null;
  
  // Signal type
  signal_type: SignalType;
  
  // Signal content
  title: string;
  description: string;
  confidence: number;  // 0.00 to 1.00
  
  // Evidence
  evidence: Record<string, unknown>[];
  affected_entities: Record<string, unknown>[];
  
  // Impact assessment
  impact_level: ImpactLevel | null;
  estimated_impact: Record<string, unknown>;
  
  // Recommended action
  recommended_action: string | null;
  action_type: SignalActionType | null;
  
  // Status
  status: SignalStatus;
  
  // Metadata
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
}

export type DecisionOutcome = 
  | "success" 
  | "partial" 
  | "failure";

export interface Decision {
  id: string;
  user_id: string;
  coworker_id: string | null;
  
  // Context
  situation_type: string;
  context: Record<string, unknown>;
  
  // What Dobly recommended
  dobly_recommendation: Record<string, unknown>;
  dobly_confidence: number;
  
  // What the owner chose
  owner_choice: Record<string, unknown>;
  owner_reasoning: string | null;
  
  // Outcome
  outcome: DecisionOutcome;
  outcome_metrics: Record<string, unknown>;
  
  // Learning
  pattern_extracted: Record<string, unknown> | null;
  should_automate: boolean | null;
  automation_conditions: Record<string, unknown> | null;
  
  // Metadata
  created_at: string;
  outcome_at: string | null;
}

export type EscalationType = 
  | "approval" 
  | "human_review" 
  | "risk" 
  | "failure" 
  | "uncertainty";

export type OwnerAction = 
  | "approved" 
  | "rejected" 
  | "modified" 
  | "escalated_further";

export type EscalationStatus = 
  | "pending" 
  | "approved" 
  | "rejected" 
  | "modified" 
  | "escalated_further";

export interface Escalation {
  id: string;
  user_id: string;
  coworker_id: string | null;
  
  // Escalation context
  escalation_type: EscalationType;
  reason: string;
  context: Record<string, unknown>;
  
  // Trust ramp info
  trust_level_at_time: number;  // 0.00 to 1.00
  autonomy_level: string | null;
  
  // Owner action
  owner_action: OwnerAction | null;
  owner_feedback: string | null;
  action_taken_at: string | null;
  
  // Learning
  was_correct_escalation: boolean | null;
  learning_signal: Record<string, unknown> | null;
  
  // Status
  status: EscalationStatus;
  
  // Metadata
  created_at: string;
  resolved_at: string | null;
}

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
  brain_view_enabled?: boolean | null;
  brain_tooltip_seen?: boolean | null;
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
  | "claude_mcp"
  | "delay"
  | "branch"
  | "skill"
  | "file_write"
  | "orchestrate_document";

export type WorkflowExecutionType = "standard" | "intelligence";
export type WorkflowStepFailureMode = "stop" | "continue" | "escalate";
export type WorkflowStepConditionOperator =
  | "exists"
  | "not_exists"
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "truthy"
  | "falsy";
export type WorkflowRuntimeMode = "agent" | "automation" | "pipeline" | "hybrid";
export type WorkflowPlannerMode = "static" | "adaptive";
export type WorkflowReportStyle = "brief" | "standard" | "executive";

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
export type AgentDepartment =
  | "front_desk"
  | "support_desk"
  | "sales_desk"
  | "finance_desk"
  | "custom";
export type AgentVoiceProvider = "google" | "eleven-labs" | "azure" | "aws" | "piper";

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
  profile: {
    department: AgentDepartment;
    role: string;
    industry: string;
    businessName: string;
    description: string;
    firstMessage: string;
    successSignal: string;
  };

  // Prompt & Behavior
  systemPrompt: string;
  conversationTone: "professional" | "friendly" | "empathetic" | "formal";
  behaviorRules: string[];
  maxResponseLength: number;
  knowledgeBase?: string;

  // Voice Configuration
  voiceProvider: AgentVoiceProvider;
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
      numberStrategy: "dobly_managed" | "bring_your_own";
      provider: "kenya_local" | "africas_talking" | "twilio" | "vonage" | "bandwidth";
      phoneNumber?: string;
      phoneNumberSid?: string;
      assignedLabel?: string;
      inboundWebhookPath?: string;
      statusWebhookPath?: string;
      callRecordingEnabled?: boolean;
      transcriptionEnabled?: boolean;
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

export interface WorkflowStepCondition {
  source: "trigger" | "steps" | "memory" | "runtime";
  path: string;
  operator: WorkflowStepConditionOperator;
  value?: string | number | boolean;
}

export interface WorkflowRuntimeConfig {
  mode: WorkflowRuntimeMode;
  planner: WorkflowPlannerMode;
  memoryEnabled: boolean;
  memoryKeys: string[];
  reportStyle: WorkflowReportStyle;
  notifyOn: Array<"success" | "failure" | "approval" | "changes_only">;
  dedupeWindowMinutes?: number;
  dedupeKeys?: string[];
  observationGoal?: string;
  maxRunSeconds?: number;
  maxStepCount?: number;
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
  condition?: WorkflowStepCondition | null;
  onFailure?: WorkflowStepFailureMode;
  saveOutputAs?: string | null;
  saveToMemory?: string[];
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  version: number;
  trigger: WorkflowTrigger;
  operator?: WorkflowOperator;
  runtime?: WorkflowRuntimeConfig;
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
  operating_model?: {
    job_to_be_done: string;
    responsibilities: string[];
    watches: string[];
    work_talents: string[];
    handled_by_dobly: string[];
    access_needed_now: string[];
    access_optional_later: string[];
    approval_contract: string[];
    update_contract: string[];
    learning_contract?: string[];
    success_definition: string[];
  };
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

export type AgentAudience = "personal" | "business" | "both";
export type AgentStatus = "draft" | "active" | "paused" | "archived";
export type AutomationStatus = "draft" | "active" | "paused" | "archived";
export type KnowledgeSourceType = "file" | "url" | "note" | "connection_sync";

export interface Agent {
  id: string;
  user_id: string;
  workspace_id: string | null;
  workflow_id: string | null;
  name: string;
  role: string;
  objective: string;
  category: string;
  audience_type: AgentAudience;
  status: AgentStatus;
  persona_config: Record<string, unknown>;
  autonomy_mode: WorkflowOperatorAutonomy;
  approval_policy_id: string | null;
  default_report_style: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentMemory {
  id: string;
  agent_id: string;
  memory_type: "preference" | "fact" | "working_context" | "watchlist" | "instruction";
  key: string;
  value: Record<string, unknown>;
  source: string | null;
  confidence: number | null;
  expires_at: string | null;
  updated_at: string;
}

export interface Automation {
  id: string;
  user_id: string;
  workspace_id: string | null;
  agent_id: string | null;
  workflow_id: string | null;
  name: string;
  goal: string;
  status: AutomationStatus;
  trigger_type: "manual" | "schedule" | "webhook" | "event" | "threshold";
  trigger_config: Record<string, unknown>;
  condition_config: Record<string, unknown>;
  delivery_config: Record<string, unknown>;
  schedule_config: Record<string, unknown>;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  id: string;
  automation_id: string;
  position: number;
  step_type: "research" | "reason" | "tool_action" | "message" | "approval" | "report" | "browser" | "api";
  label: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface KnowledgeBase {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  visibility: "private" | "workspace";
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItem {
  id: string;
  knowledge_base_id: string;
  source_type: KnowledgeSourceType;
  title: string;
  content_ref: string | null;
  raw_text: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  agent_id: string | null;
  automation_id: string | null;
  workflow_id: string | null;
  run_id: string | null;
  report_type: string;
  title: string;
  body: string;
  delivery_status: string | null;
  created_at: string;
}

export interface Template {
  id: string;
  slug: string;
  name: string;
  audience_type: AgentAudience;
  category: string;
  prompt_seed: string;
  default_agent_config: Record<string, unknown>;
  default_automation_config: Record<string, unknown>;
  required_connections: string[];
  required_knowledge_types: string[];
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

export type ConnectionVerificationChannel = "whatsapp" | "email" | "sms";
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

export type WorkspaceRole = "owner" | "admin" | "operator" | "analyst" | "viewer";
export type WorkspaceMemberStatus = "active" | "invited" | "suspended" | "removed";

export interface Workspace {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  region: string | null;
  timezone: string;
  status: "active" | "paused" | "archived";
  current_trust_stage: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  permissions: Record<string, unknown>;
  invited_by: string | null;
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
    name: "Signal Room",
    price_kes: 2600,
    price_usd: 20,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_SIGNAL_ROOM_PRICE_ID ?? process.env.NEXT_PUBLIC_STRIPE_LAUNCHPAD_PRICE_ID ?? null,
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
    badge: "Best first paid move",
  },
  {
    id: "operator",
    name: "Momentum Desk",
    price_kes: 6400,
    price_usd: 49.99,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_MOMENTUM_DESK_PRICE_ID ?? process.env.NEXT_PUBLIC_STRIPE_OPERATOR_PRICE_ID ?? null,
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
    badge: "Most chosen",
  },
  {
    id: "command",
    name: "Command Floor",
    price_kes: 16700,
    price_usd: 129,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_COMMAND_FLOOR_PRICE_ID ?? process.env.NEXT_PUBLIC_STRIPE_COMMAND_PRICE_ID ?? null,
    max_workflows: 300,
    max_standard_executions: 50000,
    max_intelligence_actions: 1800,
    standard_execution_overage_label: "$0.40 / extra 1,000 standard executions",
    intelligence_overage_label: "$0.03 / extra intelligence action",
    features: [
      "300 active workflows",
      "50,000 standard executions / month",
      "1,800 intelligence actions / month",
      "Multi-seat workspace access",
      "Advanced approvals and launch controls",
      "Priority support",
    ],
    badge: "Built for serious volume",
  },
];

export const PLAN_LIMITS: Record<PlanId, number> = {
  free: 3,
  starter: 20,
  operator: 100,
  business: 300,
  command: 300,
};

export interface GenerateWorkflowRequest {
  prompt: string;
  operatorModel?: "automation" | "agent" | "pipeline" | "hybrid" | "report";
  clarifications?: {
    responsibility?: string;
    watch?: string;
    access?: string;
    approvals?: string;
    updates?: string;
  };
}

export interface GenerateWorkflowResponse {
  workflow: WorkflowBlueprint;
  workflow_id: string;
  pod_id?: string | null;
  pod_spec?: import("@/lib/pods/types").PodSpec;
  pod_warning?: string;
  missing_providers?: string[];
  connection_strategy?: {
    likely_category: WorkflowCategory;
    required_provider_ids: string[];
    optional_provider_ids: string[];
    managed_capability_ids: string[];
  };
  classification?: {
    operator_model: "automation" | "agent" | "pipeline" | "hybrid" | "report";
    explanation: string;
    primary_segment:
      | "business_owner"
      | "freelancer"
      | "individual"
      | "service_business"
      | "ecommerce"
      | "agency"
      | "creator"
      | "general";
  };
  explanation?: {
    what_this_is: string;
    why_built_this_way: string;
    what_happens_next: string[];
    assumptions: string[];
    approval_points: string[];
    failure_modes: string[];
    confidence: number;
    confidence_label: "high" | "medium" | "needs_review";
    confidence_reason: string;
    defaults: {
      operator_type: "automation" | "agent" | "pipeline" | "hybrid" | "report";
      trigger_strategy: string;
      approval_policy: string;
      retry_policy: string;
      first_connection: string;
    };
  };
  workspace_memory?: string[];
  policy_summary?: string[];
  first_value_checklist?: string[];
  next_url?: string | null;
  vertical?: {
    id: string;
    title: string;
    tagline: string;
    purpose: string;
    recommended_connections: string[];
    toolkit: string[];
    workflow_logic: string[];
    memory_fields: string[];
    approval_rules: string[];
    outputs: string[];
    onboarding_questions: Array<{
      id: string;
      label: string;
      help: string;
      placeholder: string;
    }>;
  };
  operating_model?: {
    job_to_be_done: string;
    responsibilities: string[];
    watches: string[];
    work_talents: Array<{
      id: string;
      title: string;
      summary: string;
      capabilities: string[];
    }>;
    handled_by_dobly: string[];
    access_needed_now: string[];
    access_optional_later: string[];
    approval_contract: string[];
    update_contract: string[];
    learning_contract: string[];
    success_definition: string[];
  };
  capability_plan?: {
    summary: {
      ready_now: number;
      one_unlock: number;
      draft_ready: number;
    };
    items: Array<{
      id: string;
      title: string;
      user_need: string;
      status: "dobly_now" | "connected_now" | "unlock_one" | "draft_ready";
      status_label: string;
      summary: string;
      required_for_live: boolean;
      delivered_by_dobly: boolean;
      connected_provider_id?: string | null;
      connected_provider_label?: string | null;
      recommended_provider_id?: string | null;
      recommended_provider_label?: string | null;
      unlock_options: string[];
      fallback_path: string;
    }>;
  };
}

export interface ApiError {
  error: string;
  code?: string;
}

export type CoworkerStatus =
  | "draft"
  | "active"
  | "simulated"
  | "shadow"
  | "guarded_live"
  | "delegated_live"
  | "paused"
  | "archived";
export type CoworkerDeploymentStage = "draft" | "simulation" | "shadow" | "guarded_live" | "delegated_live";
export type CoworkerAutonomyMode = "supervised" | "guarded" | "delegated";

export interface Coworker {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  workflow_id: string | null;
  operating_spec_id: string | null;
  name: string;
  role: string;
  mission: string;
  prompt: string;
  status: CoworkerStatus;
  deployment_stage: CoworkerDeploymentStage;
  autonomy_mode: CoworkerAutonomyMode;
  tone: string | null;
  permissions: Record<string, unknown>;
  success_metrics: string[];
  memory_scope: Record<string, unknown>;
  launch_readiness_score: number;
  launch_readiness_notes: string[];
  created_at: string;
  updated_at: string;
}

export interface CoworkerStandard {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  coworker_id: string | null;
  name: string;
  promise: string;
  metric_name: string | null;
  target_value: string | null;
  escalation_rule: string | null;
  status: "active" | "paused" | "archived";
  created_at: string;
  updated_at: string;
}

export interface OperatingSpecRecord {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  coworker_id?: string | null;
  source_prompt: string;
  compiled_goal: string;
  operating_model: "automation" | "agent" | "pipeline" | "hybrid" | "report";
  version_number: number;
  spec: Record<string, unknown>;
  compiler_notes: Record<string, unknown>;
  status: "draft" | "active" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BriefingRecord {
  id: string;
  workspace_id: string;
  briefing_type: "morning" | "daily" | "weekly" | "incident" | "return_from_absence";
  title: string;
  summary: string;
  body: Record<string, unknown>;
  generated_at: string;
  acknowledged_at: string | null;
}

export interface SignalRecord {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  coworker_id?: string | null;
  signal_type: "growth" | "risk" | "churn" | "cash_flow" | "demand" | "operations" | "supplier" | "custom";
  title: string;
  summary: string;
  recommendation: string | null;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  surfaced_at: string;
  resolved_at: string | null;
}

export interface EscalationRecord {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  coworker_id?: string | null;
  operating_spec_id: string | null;
  title: string;
  summary: string;
  recommendation: string | null;
  risk_level: "low" | "medium" | "high" | "critical";
  status: "open" | "decided" | "dismissed";
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface DecisionRecord {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  coworker_id?: string | null;
  decision_type: string;
  context: Record<string, unknown>;
  chosen_action: string | null;
  chosen_by: string | null;
  source: "owner" | "agent" | "rule" | "system";
  outcome_summary: string | null;
  created_at: string;
}

export interface OperatingStateRecord {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  coworker_id?: string | null;
  title: string;
  objective: string;
  desired_condition: string;
  state_type: "sla" | "risk" | "coverage" | "throughput" | "quality" | "financial" | "custom";
  status: "active" | "paused" | "archived";
  health_status: "healthy" | "watching" | "at_risk" | "breached" | "recovering" | "unknown";
  target_metric: string | null;
  target_config: Record<string, unknown>;
  watch_config: Record<string, unknown>;
  action_playbook: Record<string, unknown>;
  approval_policy: Record<string, unknown>;
  last_evaluated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StateEvaluationRecord {
  id: string;
  state_id: string;
  workspace_id: string;
  desk_id: string | null;
  health_status: "healthy" | "watching" | "at_risk" | "breached" | "recovering" | "unknown";
  health_score: number;
  pressure_score: number;
  drift_summary: string | null;
  evidence: Record<string, unknown>;
  recommended_action: string | null;
  evaluated_at: string;
}

export interface PressureEventRecord {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  state_id: string | null;
  coworker_id?: string | null;
  severity: "low" | "medium" | "high" | "critical";
  pressure_score: number;
  title: string;
  summary: string;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}

export interface ActionCandidateRecord {
  id: string;
  workspace_id: string;
  desk_id: string | null;
  state_id: string | null;
  coworker_id?: string | null;
  title: string;
  summary: string;
  action_kind: "notify" | "task" | "simulate" | "approval" | "workflow" | "message" | "custom";
  execution_mode: "observe" | "simulate" | "supervised" | "autonomous";
  risk_level: "low" | "medium" | "high" | "critical";
  confidence: number;
  payload: Record<string, unknown>;
  status: "open" | "approved" | "executing" | "completed" | "dismissed";
  created_at: string;
  updated_at: string;
}

export interface CoworkerSimulationRecord {
  id: string;
  coworker_id: string;
  scenario_name: string;
  scenario_input: Record<string, unknown>;
  expected_behavior: string[];
  risk_flags: string[];
  status: "generated" | "reviewed" | "approved";
  created_at: string;
}

export interface CoworkerHealthSnapshot {
  coworker_id: string;
  trust_score: number;
  autonomy_score: number;
  quality_score: number;
  business_value_score: number;
  escalation_rate: number;
  override_rate: number;
  recent_issues: string[];
  recommended_improvements: string[];
}
