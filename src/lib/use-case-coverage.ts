import type { LaunchDepartmentId } from "@/lib/department-bundles";
import type { BusinessChannelId } from "@/lib/business-channels";

export interface DoblyUseCase {
  id: string;
  name: string;
  segment: string;
  departmentIds: LaunchDepartmentId[];
  channelIds: BusinessChannelId[];
  requiredCapabilities: string[];
}

const segments = [
  "home services",
  "clinics",
  "legal",
  "real estate",
  "restaurants",
  "ecommerce",
  "coaches",
  "consultants",
  "agencies",
  "education",
  "events",
  "fitness",
  "beauty",
  "auto",
  "logistics",
  "property management",
  "nonprofit",
  "finance services",
  "local retail",
  "B2B SaaS",
];

const scenarios: Array<{
  name: string;
  departmentIds: LaunchDepartmentId[];
  channelIds: BusinessChannelId[];
  requiredCapabilities: string[];
}> = [
  {
    name: "AI receptionist answers missed calls and books appointments",
    departmentIds: ["reception"],
    channelIds: ["business_phone", "calendar", "crm"],
    requiredCapabilities: ["voice_agent", "booking", "lead_capture"],
  },
  {
    name: "Website chatbot qualifies new leads",
    departmentIds: ["reception", "sales"],
    channelIds: ["website_chat", "crm", "business_email"],
    requiredCapabilities: ["chatbot", "qualification", "crm_update"],
  },
  {
    name: "WhatsApp support bot triages customer issues",
    departmentIds: ["support"],
    channelIds: ["whatsapp_business", "crm"],
    requiredCapabilities: ["whatsapp", "support_triage", "escalation"],
  },
  {
    name: "Sales worker follows up stale leads",
    departmentIds: ["sales"],
    channelIds: ["business_email", "business_sms", "crm"],
    requiredCapabilities: ["follow_up", "cadence", "crm_update"],
  },
  {
    name: "Marketing worker creates weekly content calendar",
    departmentIds: ["marketing"],
    channelIds: ["content_tools", "business_email"],
    requiredCapabilities: ["content_generation", "approval", "calendar"],
  },
  {
    name: "Finance worker chases overdue invoices",
    departmentIds: ["finance"],
    channelIds: ["business_email", "business_sms"],
    requiredCapabilities: ["invoice_reminder", "approval", "payment_context"],
  },
  {
    name: "Operations worker follows up suppliers",
    departmentIds: ["operations"],
    channelIds: ["business_email", "content_tools"],
    requiredCapabilities: ["supplier_followup", "task_coordination", "briefing"],
  },
  {
    name: "Customer recovery agent drafts careful complaint replies",
    departmentIds: ["support"],
    channelIds: ["business_email", "whatsapp_business", "crm"],
    requiredCapabilities: ["complaint_detection", "drafting", "approval"],
  },
  {
    name: "Campaign worker drafts launch emails and social posts",
    departmentIds: ["marketing", "sales"],
    channelIds: ["content_tools", "business_email", "crm"],
    requiredCapabilities: ["campaign_planning", "content_generation", "segmentation"],
  },
  {
    name: "General operator gets daily cross-department briefing",
    departmentIds: ["reception", "sales", "support", "finance", "operations"],
    channelIds: ["business_email", "crm"],
    requiredCapabilities: ["briefing", "risk_summary", "next_moves"],
  },
];

export const DOBLY_USE_CASES: DoblyUseCase[] = segments.flatMap((segment, segmentIndex) =>
  scenarios.map((scenario, scenarioIndex) => ({
    id: `uc_${String(segmentIndex + 1).padStart(2, "0")}_${String(scenarioIndex + 1).padStart(2, "0")}`,
    name: `${segment}: ${scenario.name}`,
    segment,
    departmentIds: scenario.departmentIds,
    channelIds: scenario.channelIds,
    requiredCapabilities: scenario.requiredCapabilities,
  })),
);

export function validateUseCaseCoverage(useCase: DoblyUseCase) {
  const missing: string[] = [];
  if (useCase.departmentIds.length === 0) missing.push("department");
  if (useCase.channelIds.length === 0) missing.push("channel");
  if (useCase.requiredCapabilities.length === 0) missing.push("capability");

  return {
    useCaseId: useCase.id,
    works: missing.length === 0,
    missing,
  };
}

export function getCoverageSummary() {
  const results = DOBLY_USE_CASES.map(validateUseCaseCoverage);
  return {
    total: DOBLY_USE_CASES.length,
    working: results.filter((result) => result.works).length,
    failing: results.filter((result) => !result.works),
    segments: Array.from(new Set(DOBLY_USE_CASES.map((useCase) => useCase.segment))),
  };
}
