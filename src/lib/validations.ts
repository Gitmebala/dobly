import { z } from "zod";

const doblyDepartmentIds = [
  "reception",
  "sales",
  "marketing",
  "support",
  "finance",
  "operations",
  "engineering_product",
  "leadership",
  "admin",
] as const;

const doblyWorkTypeIds = ["communicate", "research", "create", "coordinate", "build", "monitor", "decide"] as const;
const doblyOutputTypeIds = [
  "message",
  "task",
  "alert",
  "brief",
  "document",
  "presentation",
  "spreadsheet_report",
  "image_design",
  "video",
  "code_context_package",
  "approval_request",
] as const;
const doblyTriggerTypeIds = [
  "owner_request",
  "inbound_signal",
  "scheduled_trigger",
  "threshold_alert",
  "workflow_handoff",
  "external_event",
] as const;
const doblyTrustLevelIds = ["informational", "draft_propose", "safe_auto_run", "approval_required", "human_only"] as const;
const doblyMemoryScopeIds = ["run", "department", "workspace", "customer", "project", "company"] as const;

export const doblyIntentSchema = z.object({
  departmentId: z.enum(doblyDepartmentIds),
  workTypeId: z.enum(doblyWorkTypeIds),
  outputTypeId: z.enum(doblyOutputTypeIds),
  triggerTypeId: z.enum(doblyTriggerTypeIds),
  trustLevelId: z.enum(doblyTrustLevelIds),
  memoryScopeId: z.enum(doblyMemoryScopeIds),
  executionLaneId: z.enum(["native_api", "browser", "http_webhook", "local_desktop", "voice", "artifact_pipeline"]),
  capabilityState: z.enum(["live", "assisted", "planned"]),
  route: z.enum(["research", "media", "publishing", "payments_commerce", "software_execution", "memory_synthesis", "approval_only"]),
  preferredToolId: z.string().trim().max(160).nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.array(z.string().trim().max(280)).max(20),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters")
    .optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(100),
});

export const generateWorkflowSchema = z.object({
  prompt: z
    .string()
    .min(10, "Describe your automation in at least 10 characters")
    .max(1000, "Description too long - keep it under 1000 characters")
    .trim()
    .refine(
      (val) => !/<script|javascript:|data:/i.test(val),
      "Invalid characters in prompt"
    ),
  operatorModel: z.enum(["automation", "agent", "pipeline", "hybrid", "report"]).optional(),
  clarifications: z
    .object({
      responsibility: z.string().trim().max(500).optional(),
      watch: z.string().trim().max(400).optional(),
      access: z.string().trim().max(400).optional(),
      approvals: z.string().trim().max(500).optional(),
      updates: z.string().trim().max(500).optional(),
    })
    .optional(),
});

const faqEntrySchema = z.object({
  question: z.string().trim().min(1).max(240),
  answer: z.string().trim().min(1).max(2000),
});

export const businessProfileSchema = z.object({
  business_name: z.string().trim().min(2).max(140),
  business_type: z.string().trim().max(120).nullable().optional(),
  website_url: z.string().url().max(500).nullable().optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  locations: z.array(z.string().trim().min(1).max(180)).max(20).optional(),
  opening_hours: z.string().trim().max(1000).nullable().optional(),
  contact_details: z.record(z.string(), z.unknown()).optional(),
  brand_voice: z.string().trim().max(600).nullable().optional(),
  faq_entries: z.array(faqEntrySchema).max(30).optional(),
  policies: z.array(z.string().trim().min(1).max(1000)).max(30).optional(),
  source_urls: z.array(z.string().url().max(500)).max(20).optional(),
  context_summary: z.string().trim().max(3000).nullable().optional(),
});

export const businessProfileAnalyzeSchema = z.object({
  website_url: z.string().url().max(500),
  business_name: z.string().trim().max(140).optional(),
});

const workflowStepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  app: z.string().min(1).max(120),
  actionType: z.enum([
    "compose_text",
    "send_email",
    "webhook_request",
    "claude_mcp",
    "delay",
    "branch",
    "skill",
    "file_write",
    "orchestrate_document",
  ]),
  lane: z.enum(["native", "generic"]).optional(),
  connectorId: z.string().optional(),
  connectorActionId: z.string().optional(),
  condition: z
    .object({
      source: z.enum(["trigger", "steps", "memory", "runtime"]),
      path: z.string().min(1).max(200),
      operator: z.enum([
        "exists",
        "not_exists",
        "equals",
        "not_equals",
        "contains",
        "greater_than",
        "less_than",
        "truthy",
        "falsy",
      ]),
      value: z.union([z.string(), z.number(), z.boolean()]).optional(),
    })
    .nullable()
    .optional(),
  onFailure: z.enum(["stop", "continue", "escalate"]).optional(),
  saveOutputAs: z.string().min(1).max(120).nullable().optional(),
  saveToMemory: z.array(z.string().min(1).max(120)).max(20).optional(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
});

const conversationNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.enum(["greeting", "question", "decision", "action", "handoff", "end"]),
    text: z.string().min(1).max(1000),
    nextNode: z.string().optional(),
    branches: z
      .array(
        z.object({
          condition: z.string().min(1).max(500),
          targetNodeId: z.string().min(1),
        })
      )
      .optional(),
    actionType: z.string().optional(),
    actionConfig: z.record(z.string(), z.unknown()).optional(),
  })
);

const agentConfigCoreSchema = z.object({
    profile: z.object({
      department: z.enum(["front_desk", "support_desk", "sales_desk", "finance_desk", "custom"]),
      role: z.string().min(1).max(120),
      industry: z.string().max(120),
      businessName: z.string().max(160),
      description: z.string().max(1000),
      firstMessage: z.string().max(500),
      successSignal: z.string().max(500),
    }),
    systemPrompt: z.string().min(1).max(3000),
    conversationTone: z.enum(["professional", "friendly", "empathetic", "formal"]),
    behaviorRules: z.array(z.string().min(1).max(500)).max(20).optional(),
    maxResponseLength: z.number().int().positive().max(4000).optional(),
    knowledgeBase: z.string().max(5000).optional(),
    voiceProvider: z.enum(["google", "eleven-labs", "azure", "aws", "piper"]),
    voiceId: z.string().min(1).max(120),
    language: z.string().min(2).max(10),
    accent: z.string().max(120).optional(),
    speechRate: z.number().min(0.5).max(2).optional(),
    pitch: z.number().min(-20).max(20).optional(),
    conversationFlow: z.array(conversationNodeSchema).min(1).max(50),
    maxTurnCount: z.number().int().positive().max(100).optional(),
    silenceTimeoutSeconds: z.number().int().positive().max(120).optional(),
    callActions: z.object({
      beforeCall: z.object({
        fetchContext: z.string().max(500).optional(),
        announceCallerName: z.boolean().optional(),
        playHoldingMessage: z.boolean().optional(),
      }),
      duringCall: z.object({
        allowTransfers: z.boolean().optional(),
        transferPhoneNumber: z.string().regex(/^\+?[\d\s-()]{7,}$/).optional(),
        pauseForConfirmation: z.array(z.string()).optional(),
      }),
      afterCall: z.object({
        recordTranscript: z.boolean().optional(),
        sendEmail: z.array(z.string().email()).optional(),
        webhookUrl: z.string().url().optional(),
        scheduleFollowup: z.boolean().optional(),
        followupDelayMinutes: z.number().int().positive().optional(),
      }),
    }),
    calendarIntegration: z
      .object({
        provider: z.enum(["google", "microsoft", "calendly", "slack"]),
        enabled: z.boolean(),
        checkAvailability: z.boolean().optional(),
        autoBook: z.boolean().optional(),
        calendarIds: z.array(z.string()).optional(),
        bufferMinutes: z.number().int().min(0).max(480).optional(),
        timezone: z.string().min(1).max(100),
        businessHours: z.object({
          monday: z
            .object({ start: z.string(), end: z.string() })
            .nullable()
            .optional(),
          tuesday: z
            .object({ start: z.string(), end: z.string() })
            .nullable()
            .optional(),
          wednesday: z
            .object({ start: z.string(), end: z.string() })
            .nullable()
            .optional(),
          thursday: z
            .object({ start: z.string(), end: z.string() })
            .nullable()
            .optional(),
          friday: z
            .object({ start: z.string(), end: z.string() })
            .nullable()
            .optional(),
          saturday: z
            .object({ start: z.string(), end: z.string() })
            .nullable()
            .optional(),
          sunday: z
            .object({ start: z.string(), end: z.string() })
            .nullable()
            .optional(),
        }),
      })
      .optional(),
    escalation: z.object({
      triggers: z
        .array(
          z.object({
            type: z.enum([
              "confidence_below",
              "keyword_match",
              "call_duration_exceeded",
              "repeated_misunderstanding",
            ]),
            threshold: z.number().min(0).max(1).optional(),
            keywords: z.array(z.string()).optional(),
            seconds: z.number().int().positive().optional(),
            count: z.number().int().positive().optional(),
          })
        )
        .optional(),
      handoffMessage: z.string().max(500).optional(),
      handoffPhoneNumber: z.string().regex(/^\+?[\d\s-()]{7,}$/).optional(),
      handoffEmail: z.string().email().optional(),
      escalationQueue: z.enum(["round_robin", "first_available", "skill_based"]).optional(),
      maxWaitTime: z.number().int().positive().optional(),
    }),
    integrations: z.object({
      crm: z
        .object({
          provider: z.enum(["salesforce", "hubspot", "pipedrive"]),
          syncOnCall: z.boolean().optional(),
          createLead: z.boolean().optional(),
          updateContact: z.boolean().optional(),
        })
        .optional(),
      dataConnections: z
        .array(
          z.object({
            connectionId: z.string(),
            syncField: z.string(),
            syncDirection: z.enum(["read", "write", "bidirectional"]),
          })
        )
        .optional(),
    }),
    deployment: z.object({
      channels: z
        .array(z.enum(["voice", "whatsapp", "sms", "web", "api"]))
        .optional(),
      voiceChannelConfig: z
        .object({
          numberStrategy: z.enum(["dobly_managed", "bring_your_own"]),
          provider: z.enum(["kenya_local", "africas_talking", "twilio", "vonage", "bandwidth"]),
          phoneNumber: z.string().optional(),
          phoneNumberSid: z.string().optional(),
          assignedLabel: z.string().max(120).optional(),
          inboundWebhookPath: z.string().max(500).optional(),
          statusWebhookPath: z.string().max(500).optional(),
          callRecordingEnabled: z.boolean().optional(),
          transcriptionEnabled: z.boolean().optional(),
        })
        .optional(),
      webChannelConfig: z
        .object({
          embedUrl: z.string().url(),
          widgetTheme: z.enum(["light", "dark"]),
        })
        .optional(),
      apiConfig: z
        .object({
          webhookSecret: z.string(),
          rateLimit: z.number().int().positive(),
        })
        .optional(),
    }),
    monitoring: z.object({
      recordCalls: z.boolean().optional(),
      transcriptSentiment: z.boolean().optional(),
      keywords: z.array(z.string()).optional(),
      reportingEmail: z.array(z.string().email()).optional(),
    }),
  })
;

export const agentConfigSchema = agentConfigCoreSchema.optional();
export const partialAgentConfigSchema = agentConfigCoreSchema.deepPartial();

const workflowDefinitionSchema = z.object({
  version: z.number().int().positive(),
  trigger: z.object({
    type: z.enum(["manual", "webhook", "schedule"]),
    label: z.string().min(1).max(200),
    schedule: z.string().optional(),
    webhook_path: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }),
  operator: z
    .object({
      enabled: z.boolean(),
      mode: z.enum(["workflow", "bounded_operator"]),
      role: z.string().min(1).max(120),
      objective: z.string().min(1).max(300),
      channel: z.string().max(120).optional(),
      autonomy: z.enum(["supervised", "guarded", "delegated"]),
      approvalRiskThreshold: z.enum(["medium", "high"]),
      allowedDomains: z.array(z.string().min(1).max(120)).max(20),
      escalationMessage: z.string().max(300).optional(),
      agentConfig: agentConfigSchema,
    })
    .optional(),
  runtime: z
    .object({
      mode: z.enum(["agent", "automation", "pipeline", "hybrid"]),
      planner: z.enum(["static", "adaptive"]),
      memoryEnabled: z.boolean(),
      memoryKeys: z.array(z.string().min(1).max(120)).max(20),
      reportStyle: z.enum(["brief", "standard", "executive"]),
      notifyOn: z
        .array(z.enum(["success", "failure", "approval", "changes_only"]))
        .max(8),
      dedupeWindowMinutes: z.number().int().positive().max(10080).optional(),
      dedupeKeys: z.array(z.string().min(1).max(120)).max(20).optional(),
      observationGoal: z.string().max(500).optional(),
    })
    .optional(),
  steps: z.array(workflowStepSchema).min(1).max(20),
});

export const updateWorkflowSchema = z.object({
  status: z.enum(["active", "paused", "draft"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  blueprint: z
    .object({
      name: z.string(),
      description: z.string(),
      trigger: z.string(),
      category: z.string(),
      steps: z.array(z.record(z.string(), z.unknown())),
      estimated_time_saved: z.string(),
      difficulty: z.enum(["Simple", "Moderate", "Complex"]),
      integrations: z.array(z.string()),
      setup_steps: z.array(z.string()),
      operating_model: z
        .object({
          job_to_be_done: z.string(),
          responsibilities: z.array(z.string()),
          watches: z.array(z.string()),
          work_talents: z.array(z.string()),
          handled_by_dobly: z.array(z.string()),
          access_needed_now: z.array(z.string()),
          access_optional_later: z.array(z.string()),
          approval_contract: z.array(z.string()),
          update_contract: z.array(z.string()),
          learning_contract: z.array(z.string()).optional(),
          success_definition: z.array(z.string()),
        })
        .optional(),
      definition: workflowDefinitionSchema.optional(),
    })
    .optional(),
});

export const triggerPayloadSchema = z.record(z.string(), z.unknown());

export const connectionCreateSchema = z.object({
  provider: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  status: z.enum(["pending", "active", "expired", "error"]).optional(),
  accountIdentifier: z.string().trim().max(180).optional().nullable(),
  scopes: z.array(z.string().trim().max(120)).max(20).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const connectionUpdateSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["pending", "active", "expired", "error"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const secureConnectionSetupSchema = connectionCreateSchema.extend({
  accessToken: z.string().max(4000).optional().nullable(),
  refreshToken: z.string().max(4000).optional().nullable(),
  secret: z.string().max(4000).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const requestConnectionCodeSchema = z.object({
  provider: z.string().trim().min(1).max(80),
  accountIdentifier: z.string().trim().min(5).max(180),
  label: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const verifyConnectionCodeSchema = z.object({
  verificationId: z.string().uuid(),
  code: z.string().trim().min(4).max(12),
});

export const requestConnectionLinkSchema = z.object({
  provider: z.string().trim().min(1).max(80),
  accountIdentifier: z.string().trim().email().max(180),
  label: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(300).optional(),
});

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters")
    .optional(),
  avatar_url: z.string().url().max(500).optional(),
});

export const checkoutSchema = z.object({
  plan_id: z.enum(["starter", "operator", "command"]),
});

export const coworkerCreateSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  role: z.string().trim().min(2).max(140),
  mission: z.string().trim().min(8).max(600),
  prompt: z.string().trim().min(10).max(2000),
  deskKey: z.string().trim().min(2).max(60).optional(),
  tone: z.string().trim().max(120).optional().nullable(),
  autonomyMode: z.enum(["supervised", "guarded", "delegated"]).optional(),
  successMetrics: z.array(z.string().trim().min(2).max(160)).max(10).optional(),
  standards: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(120),
        promise: z.string().trim().min(4).max(600),
        metric_name: z.string().trim().max(120).optional().nullable(),
        target_value: z.string().trim().max(160).optional().nullable(),
        escalation_rule: z.string().trim().max(400).optional().nullable(),
      }),
    )
    .max(12)
    .optional(),
});

export const coworkerUpdateSchema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  role: z.string().trim().min(2).max(140).optional(),
  mission: z.string().trim().min(8).max(600).optional(),
  status: z.enum(["draft", "simulated", "shadow", "guarded_live", "delegated_live", "paused", "archived"]).optional(),
  deployment_stage: z.enum(["draft", "simulation", "shadow", "guarded_live", "delegated_live"]).optional(),
  autonomy_mode: z.enum(["supervised", "guarded", "delegated"]).optional(),
  tone: z.string().trim().max(120).optional().nullable(),
  launch_readiness_score: z.number().int().min(0).max(100).optional(),
  launch_readiness_notes: z.array(z.string().trim().max(300)).max(20).optional(),
  success_metrics: z.array(z.string().trim().min(2).max(160)).max(10).optional(),
});

export const standardCreateSchema = z.object({
  coworker_id: z.string().uuid().optional().nullable(),
  desk_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(120),
  promise: z.string().trim().min(4).max(600),
  metric_name: z.string().trim().max(120).optional().nullable(),
  target_value: z.string().trim().max(160).optional().nullable(),
  escalation_rule: z.string().trim().max(400).optional().nullable(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  department_id: z.enum(doblyDepartmentIds).optional().nullable(),
  work_type_id: z.enum(doblyWorkTypeIds).optional().nullable(),
  output_type_id: z.enum(doblyOutputTypeIds).optional().nullable(),
  trigger_type_id: z.enum(doblyTriggerTypeIds).optional().nullable(),
  trust_level_id: z.enum(doblyTrustLevelIds).optional().nullable(),
  memory_scope_id: z.enum(doblyMemoryScopeIds).optional().nullable(),
  intent: doblyIntentSchema.optional(),
});

export const standardUpdateSchema = standardCreateSchema.partial();

export const decisionCaptureSchema = z.object({
  coworker_id: z.string().uuid().optional().nullable(),
  desk_id: z.string().uuid().optional().nullable(),
  escalation_id: z.string().uuid().optional().nullable(),
  decision_type: z.string().trim().min(2).max(120),
  chosen_action: z.string().trim().max(240).optional().nullable(),
  source: z.enum(["owner", "agent", "rule", "system"]).default("owner"),
  outcome_summary: z.string().trim().max(600).optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const escalationCreateSchema = z.object({
  coworker_id: z.string().uuid().optional().nullable(),
  desk_id: z.string().uuid().optional().nullable(),
  operating_spec_id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(4).max(1000),
  recommendation: z.string().trim().max(600).optional().nullable(),
  risk_level: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const briefingGenerateSchema = z.object({
  briefing_type: z.enum(["morning", "daily", "weekly", "incident", "return_from_absence"]).default("morning"),
});

export const signalGenerateSchema = z.object({
  mode: z.enum(["workspace_scan", "coworker_scan"]).default("workspace_scan"),
  coworker_id: z.string().uuid().optional().nullable(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type GenerateWorkflowInput = z.infer<typeof generateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type CoworkerCreateInput = z.infer<typeof coworkerCreateSchema>;
export type CoworkerUpdateInput = z.infer<typeof coworkerUpdateSchema>;
export type StandardCreateInput = z.infer<typeof standardCreateSchema>;
export type StandardUpdateInput = z.infer<typeof standardUpdateSchema>;
export type DecisionCaptureInput = z.infer<typeof decisionCaptureSchema>;
