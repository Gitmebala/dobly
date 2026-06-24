import { resolveCoworkerCapabilities, type CoworkerCapabilityStatus } from "@/lib/coworker-capabilities";
import type { LaunchDepartmentId } from "@/lib/department-bundles";
import type { Connection } from "@/types";

export interface DepartmentCapabilityPlan {
  departmentId: LaunchDepartmentId;
  departmentName: string;
  mission: string;
  coreCapabilityIds: string[];
  capabilities: CoworkerCapabilityStatus[];
  requiredConnectionProviderIds: string[];
  missingPlatformEnv: string[];
}

export const DEPARTMENT_CAPABILITY_BLUEPRINTS: Record<
  LaunchDepartmentId,
  {
    name: string;
    mission: string;
    prompt: string;
    coreCapabilityIds: string[];
  }
> = {
  marketing: {
    name: "Marketing & Social Media",
    mission: "Plan campaigns, create content, publish approved posts, monitor performance, and keep growth ideas moving.",
    prompt: "marketing social campaign content design video research email calendar social publishing analytics",
    coreCapabilityIds: ["write_and_plan", "research", "design", "video", "social", "documents", "calendar", "email"],
  },
  sales: {
    name: "Sales",
    mission: "Qualify leads, follow up, prepare proposals, update CRM, schedule calls, and surface opportunities.",
    prompt: "sales lead crm proposal email calendar research payment follow-up document",
    coreCapabilityIds: ["write_and_plan", "research", "crm_sales", "email", "calendar", "documents", "payments"],
  },
  reception: {
    name: "Reception",
    mission: "Answer calls and messages, qualify customers, book appointments, route exceptions, and log every interaction.",
    prompt: "reception call phone sms whatsapp customer message booking calendar voice support payment",
    coreCapabilityIds: ["calls_sms", "voice", "whatsapp", "calendar", "email", "crm_sales", "payments"],
  },
  support: {
    name: "Support",
    mission: "Answer routine questions, triage issues, recover unhappy customers, and escalate sensitive cases.",
    prompt: "support customer message whatsapp email crm document knowledge ticket complaint",
    coreCapabilityIds: ["write_and_plan", "whatsapp", "email", "crm_sales", "documents", "research"],
  },
  finance: {
    name: "Finance",
    mission: "Create payment links, monitor payments, chase invoices, flag cash risks, and prepare finance briefs.",
    prompt: "finance payment paystack mpesa invoice email document spreadsheet report analytics",
    coreCapabilityIds: ["payments", "documents", "email", "research", "write_and_plan"],
  },
  creative: {
    name: "Creative & Design",
    mission: "Create designs, decks, videos, brand assets, campaign variants, and approval-ready creative deliverables.",
    prompt: "creative design canva graphic presentation slides video content document brand asset",
    coreCapabilityIds: ["design", "video", "documents", "write_and_plan", "research", "social"],
  },
  engineering: {
    name: "Engineering & Product",
    mission: "Convert product feedback into tasks, triage issues, prepare QA, draft release notes, and coordinate technical delivery.",
    prompt: "engineering product github code issue qa release docs research project task",
    coreCapabilityIds: ["engineering_delivery", "documents", "research", "write_and_plan", "project_ops"],
  },
  operations: {
    name: "Operations",
    mission: "Coordinate tasks, suppliers, fulfillment, blockers, handoffs, and recurring operational follow-through.",
    prompt: "operations task project supplier order email calendar document workflow",
    coreCapabilityIds: ["project_ops", "email", "calendar", "documents", "research", "write_and_plan"],
  },
  admin: {
    name: "Admin",
    mission: "Handle scheduling, reminders, documents, filing, inbox admin, and recurring back-office work.",
    prompt: "admin calendar email document reminder task planning personal",
    coreCapabilityIds: ["calendar", "email", "documents", "write_and_plan", "project_ops"],
  },
  projects: {
    name: "Projects",
    mission: "Drive multi-step work, dependencies, approvals, deliverables, deadlines, and handoffs.",
    prompt: "project task document calendar email approval deliverable design engineering",
    coreCapabilityIds: ["project_ops", "documents", "calendar", "email", "design", "write_and_plan"],
  },
  hr: {
    name: "HR & People",
    mission: "Coordinate onboarding, reminders, policies, people ops tasks, and manager follow-through.",
    prompt: "hr onboarding policy document email calendar task reminder",
    coreCapabilityIds: ["documents", "email", "calendar", "project_ops", "write_and_plan"],
  },
  growth: {
    name: "Growth",
    mission: "Research opportunities, plan experiments, create campaigns, monitor competitors, and surface revenue moves.",
    prompt: "growth research competitor trend campaign sales social design analytics crm",
    coreCapabilityIds: ["research", "write_and_plan", "social", "design", "crm_sales", "documents"],
  },
  analytics: {
    name: "Analytics",
    mission: "Watch business signals, explain changes, create reports, and surface anomalies.",
    prompt: "analytics report spreadsheet data monitor research document brief",
    coreCapabilityIds: ["analytics_reporting", "research", "documents", "write_and_plan"],
  },
  compliance: {
    name: "Compliance",
    mission: "Track policy, approvals, audit trails, consent, risk, and exception handling.",
    prompt: "compliance policy approval audit risk document monitor report",
    coreCapabilityIds: ["documents", "analytics_reporting", "write_and_plan", "email"],
  },
};

export function resolveDepartmentCapabilityPlan(params: {
  departmentId: LaunchDepartmentId;
  connections?: Connection[];
}): DepartmentCapabilityPlan {
  const blueprint = DEPARTMENT_CAPABILITY_BLUEPRINTS[params.departmentId];
  const resolved = resolveCoworkerCapabilities({
    prompt: blueprint.prompt,
    connections: params.connections ?? [],
    includeAll: false,
  });
  const filtered = resolved.capabilities.filter((capability) =>
    blueprint.coreCapabilityIds.includes(capability.id),
  );

  return {
    departmentId: params.departmentId,
    departmentName: blueprint.name,
    mission: blueprint.mission,
    coreCapabilityIds: blueprint.coreCapabilityIds,
    capabilities: filtered,
    requiredConnectionProviderIds: Array.from(
      new Set(filtered.flatMap((item) => item.providerOptions.map((option) => option.connectionProviderId).filter(Boolean) as string[])),
    ),
    missingPlatformEnv: Array.from(new Set(filtered.flatMap((item) => item.missingPlatformEnv))),
  };
}
