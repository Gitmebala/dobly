import Anthropic from "@anthropic-ai/sdk";
import { getPromptConnectionStrategy } from "@/lib/provider-strategy";
import { ensureWorkflowDefinition } from "@/lib/workflow-definition";
import type { BusinessProfile, WorkflowBlueprint } from "@/types";
import { randomUUID } from "node:crypto";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import { failedProviderCharge } from "@/lib/billing/economy-core";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractAnthropicText(message: unknown) {
  const content = (message as { content?: unknown })?.content;
  if (!Array.isArray(content)) {
    const keys = message && typeof message === "object" ? Object.keys(message as Record<string, unknown>).join(", ") : "none";
    throw new Error(`Unexpected Anthropic response: missing content array. Keys: ${keys}`);
  }

  const text = content
    .filter((block): block is { type: "text"; text: string } => {
      const candidate = block as { type?: unknown; text?: unknown };
      return candidate.type === "text" && typeof candidate.text === "string";
    })
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Unexpected Anthropic response: no text content returned.");
  }

  return text;
}

async function createAnthropicMessage(input: {
  model?: string;
  maxTokens: number;
  system: string;
  userContent: string;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.model || process.env.DOBLY_PREMIUM_MODEL || "claude-sonnet-4-20250514",
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: "user", content: input.userContent }],
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      typeof data?.error?.message === "string"
        ? data.error.message
        : typeof data?.message === "string"
          ? data.message
          : `Anthropic request failed with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return data;
}

async function createGroqMessage(input: {
  model?: string;
  maxTokens: number;
  system: string;
  userContent: string;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: input.model || process.env.DOBLY_GENERATION_MODEL || process.env.DOBLY_STANDARD_MODEL || "llama-3.3-70b-versatile",
      max_tokens: input.maxTokens,
      temperature: 0.2,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.userContent },
      ],
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
        message?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Groq request failed with status ${response.status}.`);
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Unexpected Groq response: no text content returned.");
  }

  return {
    content: [{ type: "text", text }],
  };
}

async function createGenerationMessage(input: {
  maxTokens: number;
  system: string;
  userContent: string;
}) {
  const preferredProvider = process.env.DOBLY_GENERATION_PROVIDER?.toLowerCase();

  if (preferredProvider === "anthropic") {
    return createAnthropicMessage(input);
  }

  if (process.env.GROQ_API_KEY) {
    return createGroqMessage(input);
  }

  return createAnthropicMessage(input);
}

const SYSTEM_PROMPT = `You are Dobly's AI workflow architect.

Your job is to turn plain English work requests into permanent Dobly systems for business owners, freelancers, and individuals.

Dobly's promise:
- The user describes recurring work once in plain English.
- Dobly identifies the real job underneath the request.
- Dobly builds a permanent system that keeps handling that job until paused.
- The system starts safely, learns from outcomes and owner decisions, and only becomes more deterministic where repeatable patterns are proven safe.
- Do not describe this as "AI once, deterministic forever." Early runs usually need AI and supervision. Deterministic rules require evidence and owner-approved promotion.

You MUST respond with ONLY valid JSON. No markdown, no prose, no code fences.

The JSON must match this exact structure:
{
  "name": "Short descriptive name (max 60 chars)",
  "description": "One-sentence description of what this automation does",
  "trigger": "What starts this automation",
  "category": "Customer Communication" | "Sales & Marketing" | "Finance & Invoicing" | "Social Media" | "E-commerce" | "Productivity" | "Life & Personal Admin" | "Data & Reporting" | "HR & Operations" | "Other",
  "steps": [
    {
      "id": 1,
      "name": "Step name",
      "description": "What this step does",
      "tool": "Tool/app name or capability",
      "action": "Specific action name",
      "config": {},
      "output": "Optional output"
    }
  ],
  "estimated_time_saved": "e.g. 3 hours/week",
  "difficulty": "Simple" | "Moderate" | "Complex",
  "integrations": ["list", "of", "tools"],
  "setup_steps": ["practical setup steps"],
  "definition": {
    "version": 1,
    "trigger": {
      "type": "manual" | "webhook" | "schedule",
      "label": "Human-friendly trigger label",
      "schedule": "cron string when type is schedule",
      "webhook_path": "short-path when type is webhook",
      "config": {}
    },
    "operator": {
      "enabled": true,
      "mode": "bounded_operator",
      "role": "Short role name",
      "objective": "What this operator is trying to accomplish",
      "channel": "Primary operating channel",
      "autonomy": "supervised" | "guarded" | "delegated",
      "approvalRiskThreshold": "medium" | "high",
      "allowedDomains": ["tools", "channels", "areas it may operate in"],
      "escalationMessage": "When to hand off to a human"
    },
    "runtime": {
      "mode": "agent" | "automation" | "pipeline" | "hybrid",
      "planner": "static" | "adaptive",
      "memoryEnabled": true,
      "memoryKeys": ["recent_summary", "watch_context"],
      "reportStyle": "brief" | "standard" | "executive",
      "notifyOn": ["failure", "approval", "changes_only"],
      "dedupeWindowMinutes": 30,
      "dedupeKeys": ["trigger.id", "trigger.email"],
      "observationGoal": "What should be watched or optimized over time"
    },
    "steps": [
      {
        "id": "step_1",
        "name": "Step name",
        "description": "What this step does",
        "app": "Email | SMS | Gmail | Google Docs | Google Sheets | Google Calendar | Mailchimp | Zendesk | Stripe | HubSpot | Salesforce | Pipedrive | Notion | Airtable | LinkedIn | Zoom | Freshdesk | Intercom | Square | QuickBooks | Xero | Wave | Typeform | Calendly | Trello | Asana | monday.com | ClickUp | Zoho CRM | Klaviyo | DocuSign | Slack | Claude MCP | Webhook | Formatter | Delay | Branch | File",
        "actionType": "compose_text" | "send_email" | "webhook_request" | "claude_mcp" | "delay" | "branch" | "skill" | "file_write" | "orchestrate_document",
        "condition": {
          "source": "trigger" | "steps" | "memory" | "runtime",
          "path": "path.to.value",
          "operator": "exists" | "not_exists" | "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "truthy" | "falsy",
          "value": "optional comparison value"
        },
        "onFailure": "stop" | "continue" | "escalate",
        "saveOutputAs": "Optional alias for later steps",
        "saveToMemory": ["Optional memory keys"],
        "enabled": true,
        "config": {}
      }
    ]
  }
}

CRITICAL RULES - Read First:
1. INFER INTENT FROM THE PROMPT. DO NOT GUESS TOOLS THE USER DIDN'T MENTION.
2. Dobly handles most capabilities INTERNALLY. Only mark a tool as required if the user EXPLICITLY named it or if Dobly cannot fulfill the outcome.
3. When the user describes what they want (e.g., "email customers"), generate steps using outcome-driven action names, not tool names.
4. If the user mentions a specific tool by name, include it only when Dobly has a verified live runtime path. Verified live tools today: Google/Gmail/Google Docs/Google Sheets/Google Calendar, Slack, HubSpot, WhatsApp, M-PESA, Webhook/API, and Dobly-managed email. For other named tools, stage the work as a plan/report/approval and mark the external tool as a future unlock, not a live action.
5. Use the clarification answers. If the brief mentions approval rules, trigger details, failure handling, or tone, reflect them directly in the workflow.
6. Design for dependable execution: retries for transient delivery steps, visible escalation for sensitive failures, and clean human checkpoints.
7. Choose the right system shape without asking the user:
- Automation: deterministic trigger/action work, reminders, monitors, follow-ups, syncs, reports.
- Agent: ongoing role with judgment, memory, conversation, or escalation.
- Pipeline: multi-step artifact work where one step output feeds the next, including Claude MCP software operation.
- Hybrid: agent judgment plus repeatable actions.
8. Always include a progressive learning path: what starts AI-assisted, what can become a rule candidate after repeated evidence, and what remains human-approved.
9. Never auto-promote a deterministic rule in the generated plan. Rule promotion requires repeated successful examples, no recent owner corrections, low risk, clear rollback, and explicit owner approval.

CUSTOMER MODES:
- Business owner: use offices, workers, General Manager, Board, operation feed, customers, payments, WhatsApp, M-PESA, suppliers.
- Freelancer: use clients, projects, proposals, invoices, scheduling, delivery, follow-up, admin pipeline.
- Individual: use life areas, watchers, reminders, personal systems, bills, travel, stocks, subscriptions, family dates.

CAPABILITY MAPPINGS (Dobly handles these internally):
- "Email my customers" → send_email (don't force Mailchimp)
- "Send SMS/text" → SMS (Dobly has Twilio)
- "Create support ticket" → Draft ticket details unless HubSpot or a verified support connector is explicitly connected
- "Track a deal" → Track internally or use HubSpot when named/connected
- "Generate invoice" → Draft invoice details unless M-PESA payment collection is the requested live action
- "Add to a list" → Stage list update unless the destination has a verified live path
- "Create a task" → Create task (Dobly handles internally)
- "Draft content" → compose_text (Dobly's strength)
- "Route/qualify" → Dobly-managed routing (Dobly's strength)
- "Approve something" → approval workflow (Dobly handles internally)
- "Generate document" → Document generation (PDFs, contracts, etc.)
- "Create a Google Doc" → Google Docs create_document (requires Google connection)
- "Summarize data" → Data summary (Dobly's strength)
- "Use Figma/GitHub/Autodesk Fusion through Claude" → claude_mcp (only when the task truly needs Claude with MCP-operated software)

WHEN TO REQUIRE A CONNECTION:
- ONLY if the user explicitly names a tool: "Send to my Mailchimp", "Track in my Salesforce", "Pay via Stripe"
- ONLY if the action requires the user's specific account: custom CRM fields, user's bank details, user's specific settings
- Otherwise, Dobly handles it by default

WHEN TO USE WEBHOOK:
- When the user wants integration with a custom system or API they haven't named
- When the user explicitly asks for "API" or "webhook"
- NOT as a fallback for tools Dobly supports natively

Rules:
- Default to Dobly-managed capabilities first: drafting, summaries, approvals, routing, qualification, internal logic, document generation, reminders, and staging.
- Only require external connections when the user explicitly names a tool or when Dobly cannot fulfill the outcome.
- Use "send_email" when an email outcome makes sense.
- Use "claude_mcp" only when the step specifically needs Claude to operate MCP-connected software such as Figma, GitHub, Autodesk Fusion, or Notion workspace actions.
- Use runtime.mode "pipeline" when the request involves research -> creation -> document/report -> delivery, or when artifacts pass between steps.
- For native tools Dobly supports, prefer the real named app in the step instead of disguising it as a webhook.
- Use outcome-driven step names: "add_to_email_list", "create_support_ticket", "generate_invoice" instead of tool names.
- Use placeholder values in config: "{{trigger.email}}", "{{workflow.title}}", etc.
- Keep workflows practical and focused.
- Include 3-8 steps.
- Design for people and operators, not engineers.
- Support both personal automations and business automations.
- Prefer globally understandable tools and examples unless the user explicitly names a regional tool.
- If the request sounds like an ongoing role, assistant, responder, receptionist, inbox manager, order taker, support operator, or similar bounded AI worker, include definition.operator.
- Include definition.runtime for every workflow. Use adaptive planning for coworker-style or research-heavy systems and static planning for straightforward structured automations.
- Include memory writes, operation-feed updates, escalation rules, and learning/compression notes in step config where useful.
- Use step conditions when the user clearly implies routing, thresholds, urgency, confidence checks, or only-if-important behavior.
- Use onFailure: "continue" for best-effort steps and onFailure: "escalate" when a human should review failures before Dobly proceeds.
- For send_email, webhook_request, and file_write steps, include practical retryPolicy values inside config when transient failure is plausible.
- Never design unbounded autonomy. Operators must stay inside a clear role, clear goal, clear allowed domains, and a human escalation rule.`;

export async function generateWorkflowBlueprint(
  prompt: string,
  userId: string,
  businessProfile?: BusinessProfile | null
): Promise<WorkflowBlueprint> {
  const estimatedMinor = 350;
  const reservation = await reserveOperatingCapacity({
    userId,
    capability: "ai.reasoning",
    provider: process.env.DOBLY_GENERATION_PROVIDER?.toLowerCase() === "anthropic" ? "anthropic" : process.env.GROQ_API_KEY ? "groq" : "anthropic",
    estimatedMinor,
    idempotencyKey: `workflow-generation:${userId}:${randomUUID()}`,
    metadata: { promptLength: prompt.length },
  });
  try {
  const promptStrategy = getPromptConnectionStrategy(prompt);
  const message = await createGenerationMessage({
    maxTokens: 2200,
    system: SYSTEM_PROMPT,
    userContent: `User ${userId} wants this system: ${prompt}

Pre-draft connection guidance:
${JSON.stringify(
  {
    likely_category: promptStrategy.likelyCategory,
    dobly_managed_first: promptStrategy.managedCapabilities.map((item) => item.label),
    explicit_required_providers: promptStrategy.requiredProviders.map((item) => item.label),
    optional_providers: promptStrategy.optionalProviders.slice(0, 6).map((item) => item.label),
  },
  null,
  2,
)}

Business context (use only if relevant and do not invent missing facts):
${businessProfile ? JSON.stringify({
  business_name: businessProfile.business_name,
  business_type: businessProfile.business_type,
  website_url: businessProfile.website_url,
  description: businessProfile.description,
  locations: businessProfile.locations,
  opening_hours: businessProfile.opening_hours,
  contact_details: businessProfile.contact_details,
  brand_voice: businessProfile.brand_voice,
  faq_entries: businessProfile.faq_entries,
  policies: businessProfile.policies,
  context_summary: businessProfile.context_summary,
}, null, 2) : "No saved business context."}`,
  });

  const text = extractAnthropicText(message);

  let blueprint: WorkflowBlueprint;
  try {
    blueprint = JSON.parse(text) as WorkflowBlueprint;
  } catch {
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    blueprint = JSON.parse(cleaned) as WorkflowBlueprint;
  }

  if (!blueprint.name || !Array.isArray(blueprint.steps) || blueprint.steps.length === 0) {
    throw new Error("Invalid workflow structure returned by AI");
  }

    const definition = ensureWorkflowDefinition(blueprint);
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimatedMinor,
      status: "succeeded",
      metadata: { workflowName: definition.name },
    });
    return definition;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow generation failed.";
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: failedProviderCharge({ paidRail: true, estimatedMinor, errorMessage: message }),
      status: "failed",
      metadata: { error: message },
    }).catch(() => undefined);
    throw error;
  }
}

const BUSINESS_PROFILE_PROMPT = `You are Dobly's business context analyst.

Your job is to turn a business website snapshot into a clean reusable business profile draft.

Respond with ONLY valid JSON in this exact structure:
{
  "business_name": "string",
  "business_type": "string or null",
  "website_url": "string or null",
  "description": "string or null",
  "locations": ["array of strings"],
  "opening_hours": "string or null",
  "contact_details": {
    "email": "string or null",
    "phone": "string or null",
    "address": "string or null"
  },
  "brand_voice": "string or null",
  "faq_entries": [{"question": "string", "answer": "string"}],
  "policies": ["array of strings"],
  "source_urls": ["array of strings"],
  "context_summary": "short operational summary"
}

Rules:
- Be conservative and only include facts supported by the supplied content.
- If a field is unclear, return null or an empty array.
- Keep FAQ entries practical and concise.
- Keep brand voice grounded in the writing style you observe.
- Do not invent private information.`;

export async function generateBusinessProfileDraft(input: {
  userId: string;
  workspaceId?: string | null;
  websiteUrl: string;
  businessName?: string;
  websiteContent: string;
}) {
  const estimatedMinor = 350;
  const reservation = await reserveOperatingCapacity({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    capability: "ai.reasoning",
    provider: process.env.ANTHROPIC_API_KEY ? "anthropic" : "groq",
    estimatedMinor,
    idempotencyKey: `business-profile:${input.userId}:${randomUUID()}`,
    metadata: { websiteUrl: input.websiteUrl },
  });
  try {
    const message = await createGenerationMessage({
      maxTokens: 1800,
      system: BUSINESS_PROFILE_PROMPT,
      userContent: `Website URL: ${input.websiteUrl}
Suggested business name: ${input.businessName ?? "unknown"}

Website content snapshot:
${input.websiteContent.slice(0, 16000)}`,
    });

    const text = extractAnthropicText(message);

    let draft: Record<string, unknown>;
    try {
      draft = JSON.parse(text) as Record<string, unknown>;
    } catch {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      draft = JSON.parse(cleaned) as Record<string, unknown>;
    }
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimatedMinor,
      status: "succeeded",
      metadata: { websiteUrl: input.websiteUrl },
    });
    return draft;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Business profile generation failed.";
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: failedProviderCharge({ paidRail: true, estimatedMinor, errorMessage: message }),
      status: "failed",
      metadata: { websiteUrl: input.websiteUrl, error: message },
    }).catch(() => undefined);
    throw error;
  }
}
