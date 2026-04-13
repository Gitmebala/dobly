import Anthropic from "@anthropic-ai/sdk";
import { ensureWorkflowDefinition } from "@/lib/workflow-definition";
import type { BusinessProfile, WorkflowBlueprint } from "@/types";

const anthropic = new Anthropic({
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
      "tool": "Tool/app name",
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
        "app": "Resend | Webhook | Formatter | Delay | Branch",
        "actionType": "compose_text" | "send_email" | "webhook_request" | "delay" | "branch",
        "enabled": true,
        "config": {}
      }
    ]
  }
}

Rules:
- Prefer runnable actions Dobly can execute today: compose_text, send_email, webhook_request, delay, branch.
- Stay inside Dobly's strongest supported deployment surface: Google, Slack, Shopify, M-PESA, generic Webhook/API calls, file output, and Dobly's internal formatter/orchestrator.
- Do NOT rely on Microsoft, Meta, Notion, Airtable, HubSpot, Yahoo, Stripe, or WhatsApp unless the user explicitly asks for them. If the request clearly needs an unsupported integration, convert the step into a generic webhook/API action instead of pretending Dobly has a native live path.
- Use "send_email" only when an email outcome makes sense.
- Use "webhook_request" for external systems like Slack, Discord, CRMs, Shopify webhooks, custom APIs, or generic integrations.
- Use placeholder values in config, for example "{{trigger.email}}" or "{{workflow.title}}".
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
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `User ${userId} wants this system: ${prompt}

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
