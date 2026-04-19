import Anthropic from "@anthropic-ai/sdk";
import { getPromptConnectionStrategy } from "@/lib/provider-strategy";
import { ensureWorkflowDefinition } from "@/lib/workflow-definition";
import type { BusinessProfile, WorkflowBlueprint } from "@/types";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Dobly's AI workflow architect.

Your job is to turn plain English automation requests into runnable workflow plans for an automation product used for both work and life.

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
    "steps": [
      {
        "id": "step_1",
        "name": "Step name",
        "description": "What this step does",
        "app": "Email | SMS | Mailchimp | Zendesk | Stripe | HubSpot | Salesforce | Pipedrive | Notion | Airtable | LinkedIn | Zoom | Freshdesk | Intercom | Square | QuickBooks | Xero | Wave | Typeform | Calendly | Trello | Asana | monday.com | ClickUp | Zoho CRM | Klaviyo | DocuSign | Slack | Webhook | Formatter | Delay | Branch | File",
        "actionType": "compose_text" | "send_email" | "webhook_request" | "delay" | "branch" | "skill" | "file_write" | "orchestrate_document",
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
4. If the user mentions a specific tool by name (Mailchimp, Zendesk, HubSpot, etc.), include it in integrations and steps. Otherwise, let Dobly handle it.

CAPABILITY MAPPINGS (Dobly handles these internally):
- "Email my customers" → send_email (don't force Mailchimp)
- "Send SMS/text" → SMS (Dobly has Twilio)
- "Create support ticket" → Create ticket (Dobly can create in Zendesk)
- "Track a deal" → Track opportunity (Dobly can log in CRM)
- "Generate invoice" → Generate invoice (Dobly can create in Stripe)
- "Add to a list" → Add to list (Dobly can add in Mailchimp, Klaviyo, etc.)
- "Create a task" → Create task (Dobly handles internally)
- "Draft content" → compose_text (Dobly's strength)
- "Route/qualify" → Dobly-managed routing (Dobly's strength)
- "Approve something" → approval workflow (Dobly handles internally)
- "Generate document" → Document generation (PDFs, contracts, etc.)
- "Summarize data" → Data summary (Dobly's strength)

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
- Use outcome-driven step names: "add_to_email_list", "create_support_ticket", "generate_invoice" instead of tool names.
- Use placeholder values in config: "{{trigger.email}}", "{{workflow.title}}", etc.
- Keep workflows practical and focused.
- Include 3-8 steps.
- Design for people and operators, not engineers.
- Support both personal automations and business automations.
- Prefer globally understandable tools and examples unless the user explicitly names a regional tool.
- If the request sounds like an ongoing role, assistant, responder, receptionist, inbox manager, order taker, support operator, or similar bounded AI worker, include definition.operator.
- Never design unbounded autonomy. Operators must stay inside a clear role, clear goal, clear allowed domains, and a human escalation rule.`;

export async function generateWorkflowBlueprint(
  prompt: string,
  userId: string,
  businessProfile?: BusinessProfile | null
): Promise<WorkflowBlueprint> {
  const promptStrategy = getPromptConnectionStrategy(prompt);
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `User ${userId} wants this system: ${prompt}

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
      },
    ],
  });

  const content = message.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  let blueprint: WorkflowBlueprint;
  try {
    blueprint = JSON.parse(content.text) as WorkflowBlueprint;
  } catch {
    const cleaned = content.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    blueprint = JSON.parse(cleaned) as WorkflowBlueprint;
  }

  if (!blueprint.name || !Array.isArray(blueprint.steps) || blueprint.steps.length === 0) {
    throw new Error("Invalid workflow structure returned by AI");
  }

  return ensureWorkflowDefinition(blueprint);
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
  websiteUrl: string;
  businessName?: string;
  websiteContent: string;
}) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1800,
    system: BUSINESS_PROFILE_PROMPT,
    messages: [
      {
        role: "user",
        content: `Website URL: ${input.websiteUrl}
Suggested business name: ${input.businessName ?? "unknown"}

Website content snapshot:
${input.websiteContent.slice(0, 16000)}`,
      },
    ],
  });

  const content = message.content[0];
  if (!content || content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  try {
    return JSON.parse(content.text) as Record<string, unknown>;
  } catch {
    const cleaned = content.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  }
}
