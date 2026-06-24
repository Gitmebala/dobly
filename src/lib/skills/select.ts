import type { WorkflowBlueprint } from "@/types";

const SKILL_MATCHERS: Array<{ key: string; test: (text: string) => boolean }> = [
  { key: "plan_task_breakdown", test: (text) => /plan|breakdown|next steps|what should happen|orchestrate|run plan/.test(text) },
  { key: "send_whatsapp_confirmation", test: (text) => /whatsapp|confirmation|thank-you|thank you/.test(text) },
  { key: "log_payment_to_sheet", test: (text) => /sheet|google sheets|append row|log payment/.test(text) },
  { key: "compose_daily_summary", test: (text) => /summary|digest|daily summary|weekly summary/.test(text) },
  { key: "classify_customer_message", test: (text) => /classify|categorize|route message|customer message/.test(text) },
  { key: "detect_payment_anomaly", test: (text) => /anomaly|unusual|suspicious|large transaction/.test(text) },
  { key: "draft_followup_email", test: (text) => /follow-up email|follow up email|personalized email|draft email/.test(text) },
  { key: "execute_agent_task", test: (text) => /\b(agent|assistant|reception|operator|handle this request|perform this task|manage this ticket|respond to.*customer)\b/.test(text) },
  { key: "route_support_ticket", test: (text) => /support ticket|zendesk|route support|urgent issue/.test(text) },
  { key: "prepare_approval_request", test: (text) => /approval|required approval|approve/.test(text) },
  { key: "explain_connection_failure", test: (text) => /expired connection|token expired|connection failed/.test(text) },
  { key: "sync_shopify_order_to_sheet", test: (text) => /shopify order|order placed|inventory in google sheets/.test(text) },
  { key: "schedule_booking_reminder", test: (text) => /booking reminder|appointment reminder|remind the client/.test(text) },
  { key: "reconcile_inventory_update", test: (text) => /inventory|stock runs low|reconcile stock/.test(text) },
  { key: "generate_weekly_report", test: (text) => /weekly report|performance report|revenue summary/.test(text) },
  { key: "synthesize_work_report", test: (text) => /report back|what changed|what happened|executive summary|briefing/.test(text) },
  { key: "extract_structured_lead", test: (text) => /lead|typeform|contact form|crm/.test(text) },
  { key: "prepare_whatsapp_approval_reply", test: (text) => /reply yes|reply no|whatsapp approval/.test(text) },
];

export function selectSkillKeyForText(text: string) {
  const lower = text.toLowerCase();
  return SKILL_MATCHERS.find((matcher) => matcher.test(lower))?.key ?? null;
}

export function selectSkillKeyForBlueprintStep(blueprint: WorkflowBlueprint, step: WorkflowBlueprint["steps"][number]) {
  return selectSkillKeyForText(`${blueprint.name} ${blueprint.description} ${step.name} ${step.description} ${step.action} ${step.tool}`);
}
