import { z } from "zod";

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
    "delay",
    "branch",
    "skill",
    "file_write",
    "orchestrate_document",
  ]),
  lane: z.enum(["native", "generic"]).optional(),
  connectorId: z.string().optional(),
  connectorActionId: z.string().optional(),
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

const agentConfigSchema = z
  .object({
    systemPrompt: z.string().min(1).max(3000),
    conversationTone: z.enum(["professional", "friendly", "empathetic", "formal"]),
    behaviorRules: z.array(z.string().min(1).max(500)).max(20).optional(),
    maxResponseLength: z.number().int().positive().max(4000).optional(),
    knowledgeBase: z.string().max(5000).optional(),
    voiceProvider: z.enum(["google", "eleven-labs", "azure", "aws"]),
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
          phoneNumber: z.string(),
          provider: z.enum(["twilio", "vonage", "bandwidth"]),
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
  .optional();

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
  plan_id: z.enum(["starter", "pro", "agency"]),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type GenerateWorkflowInput = z.infer<typeof generateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
