import type { BusinessChannelId } from "@/lib/business-channels";
import type { LaunchDepartmentId } from "@/lib/department-bundles";

export type DoblyPlanId = "free" | "starter" | "operator" | "command" | "business";

export interface DoblyPlanEntitlements {
  homebases: number;
  departments: number;
  workers: number;
  businessChannels: number;
  includedDepartmentIds: LaunchDepartmentId[];
  includedChannelIds: BusinessChannelId[];
  aiActions: number;
  automationRuns: number;
  chatbotConversations: number;
  voiceMinutes: number;
  smsMessages: number;
  whatsappConversations: number;
  memoryItems: number;
  teamSeats: number;
  approvalWorkflows: boolean;
  generalManagerBriefings: "none" | "weekly" | "daily" | "priority";
  boardroom: "none" | "lite" | "full";
  support: "community" | "standard" | "priority";
}

export interface DoblyPlan {
  id: DoblyPlanId;
  name: string;
  tagline: string;
  monthlyPriceUsd: number;
  annualMonthlyPriceUsd: number;
  currency: "KES";
  monthlyPriceKes: number;
  annualMonthlyPriceKes: number;
  operatingAllowanceMinor: number;
  premiumActionConfirmationMinor: number;
  highlighted?: boolean;
  customerFit: string;
  marginStrategy: string;
  entitlements: DoblyPlanEntitlements;
  included: string[];
  overages: Array<{
    label: string;
    price: string;
  }>;
}

export const DOBLY_PLANS: DoblyPlan[] = [
  {
    id: "free",
    name: "Free Desk",
    tagline: "Try the Homebase and map your first department.",
    monthlyPriceUsd: 0,
    annualMonthlyPriceUsd: 0,
    currency: "KES",
    monthlyPriceKes: 0,
    annualMonthlyPriceKes: 0,
    operatingAllowanceMinor: 5_000,
    premiumActionConfirmationMinor: 0,
    customerFit: "Explorers, founders, solopreneurs, and tiny teams testing whether Dobly fits the way their company actually works.",
    marginStrategy: "No costly live voice included. Free usage is capped around memory, drafts, starter outputs, and test automations.",
    entitlements: {
      homebases: 1,
      departments: 1,
      workers: 2,
      businessChannels: 2,
      includedDepartmentIds: ["reception"],
      includedChannelIds: ["business_email", "website_chat", "calendar"],
      aiActions: 150,
      automationRuns: 100,
      chatbotConversations: 50,
      voiceMinutes: 0,
      smsMessages: 25,
      whatsappConversations: 0,
      memoryItems: 50,
      teamSeats: 1,
      approvalWorkflows: true,
      generalManagerBriefings: "weekly",
      boardroom: "none",
      support: "community",
    },
    included: [
      "1 Homebase",
      "1 department",
      "2 workers",
      "Communicate, coordinate, and brief work types",
      "Research and approval drafts",
      "Website chatbot test mode",
      "Business memory",
      "Weekly General Manager briefing",
      "Approval queue",
      "No included live voice",
    ],
    overages: [
      { label: "Voice", price: "Upgrade required" },
      { label: "Extra AI actions", price: "Upgrade required" },
    ],
  },
  {
    id: "starter",
    name: "Signal Room",
    tagline: "The first paid room for solo owners who want real daily handling, not just experiments.",
    monthlyPriceUsd: 20,
    annualMonthlyPriceUsd: 16,
    currency: "KES",
    monthlyPriceKes: 4_000,
    annualMonthlyPriceKes: 3_200,
    operatingAllowanceMinor: 80_000,
    premiumActionConfirmationMinor: 20_000,
    customerFit: "Solo operators, agencies, freelancers, and small service businesses that want Dobly handling daily customer, admin, and content work.",
    marginStrategy: "Entry tier should feel easy to buy while still keeping voice and provider costs safely capped.",
    entitlements: {
      homebases: 1,
      departments: 3,
      workers: 6,
      businessChannels: 4,
      includedDepartmentIds: ["reception", "sales", "marketing", "admin"],
      includedChannelIds: ["business_phone", "business_sms", "business_email", "website_chat", "calendar"],
      aiActions: 1200,
      automationRuns: 1000,
      chatbotConversations: 300,
      voiceMinutes: 30,
      smsMessages: 150,
      whatsappConversations: 100,
      memoryItems: 250,
      teamSeats: 1,
      approvalWorkflows: true,
      generalManagerBriefings: "daily",
      boardroom: "none",
      support: "standard",
    },
    included: [
      "1 Homebase",
      "3 departments",
      "6 workers",
      "Website chatbot and intake assistant",
      "WhatsApp follow-up and local SMS backup",
      "Light Kenya phone receptionist usage",
      "Paystack-first checkout and M-PESA payment paths",
      "Sales follow-up automations",
      "Personal and business admin automations",
      "Marketing/content support worker",
      "Research, docs, and approval-ready outputs",
      "Daily General Manager briefing",
    ],
    overages: [
      { label: "Voice minutes", price: "$0.18/min" },
      { label: "SMS", price: "$8 per 500" },
      { label: "AI actions", price: "$10 per 2,000" },
    ],
  },
  {
    id: "operator",
    name: "Momentum Desk",
    tagline: "For the business that wants Dobly live across the day, not just helping occasionally.",
    monthlyPriceUsd: 49.99,
    annualMonthlyPriceUsd: 39,
    currency: "KES",
    monthlyPriceKes: 10_000,
    annualMonthlyPriceKes: 8_000,
    operatingAllowanceMinor: 250_000,
    premiumActionConfirmationMinor: 50_000,
    highlighted: true,
    customerFit: "Growing freelancers, clinics, agencies, shops, and small teams that need a serious operating floor across customer work, content, reporting, and payments.",
    marginStrategy: "Main conversion tier with enough included usage to feel like hiring help, while overages protect cost on heavy traffic.",
    entitlements: {
      homebases: 1,
      departments: 5,
      workers: 14,
      businessChannels: 7,
      includedDepartmentIds: ["reception", "sales", "marketing", "support", "finance", "operations", "admin", "analytics"],
      includedChannelIds: [
        "business_phone",
        "business_sms",
        "whatsapp_business",
        "business_email",
        "website_chat",
        "calendar",
        "crm",
        "content_tools",
      ],
      aiActions: 5000,
      automationRuns: 7500,
      chatbotConversations: 1600,
      voiceMinutes: 180,
      smsMessages: 1000,
      whatsappConversations: 500,
      memoryItems: 1200,
      teamSeats: 2,
      approvalWorkflows: true,
      generalManagerBriefings: "daily",
      boardroom: "lite",
      support: "standard",
    },
    included: [
      "5 core departments",
      "14 workers",
      "Kenya phone, local SMS, WhatsApp, Paystack, M-PESA, email, calendar, CRM, and content channels",
      "AI voice agent",
      "Website and WhatsApp chatbots",
      "Research, sales, support, finance, and marketing automations",
      "Docs, reports, design handoffs, and media-ready workflows",
      "Boardroom Lite",
      "2 team seats",
    ],
    overages: [
      { label: "Voice minutes", price: "$0.15/min" },
      { label: "SMS", price: "$7 per 500" },
      { label: "WhatsApp conversations", price: "$12 per 1,000 + provider fees" },
      { label: "AI actions", price: "$8 per 2,000" },
    ],
  },
  {
    id: "command",
    name: "Command Floor",
    tagline: "The full operating floor for teams running serious volume, approvals, and customer traffic.",
    monthlyPriceUsd: 129,
    annualMonthlyPriceUsd: 99,
    currency: "KES",
    monthlyPriceKes: 25_000,
    annualMonthlyPriceKes: 20_000,
    operatingAllowanceMinor: 700_000,
    premiumActionConfirmationMinor: 100_000,
    customerFit: "Agencies, multi-seat teams, growing ecommerce brands, and service businesses that want Dobly live across the company every day.",
    marginStrategy: "Best-value upper tier with room for real company-wide usage while preserving margin through clear overages and seat value.",
    entitlements: {
      homebases: 2,
      departments: 8,
      workers: 40,
      businessChannels: 16,
      includedDepartmentIds: [
        "reception",
        "sales",
        "marketing",
        "support",
        "finance",
        "operations",
        "admin",
        "projects",
        "hr",
        "growth",
        "analytics",
        "compliance",
      ],
      includedChannelIds: [
        "business_phone",
        "business_sms",
        "whatsapp_business",
        "business_email",
        "website_chat",
        "calendar",
        "crm",
        "content_tools",
      ],
      aiActions: 22000,
      automationRuns: 50000,
      chatbotConversations: 9000,
      voiceMinutes: 900,
      smsMessages: 4000,
      whatsappConversations: 2200,
      memoryItems: 6000,
      teamSeats: 8,
      approvalWorkflows: true,
      generalManagerBriefings: "priority",
      boardroom: "full",
      support: "priority",
    },
    included: [
      "2 Homebases",
      "8 departments",
      "40 workers",
      "Voice, chat, WhatsApp, CRM, calendar, Paystack, M-PESA, billing, and store actions",
      "Cross-media work across docs, reports, design, and video handoff",
      "Advanced approvals and team roles",
      "Full Boardroom",
      "Priority General Manager briefings",
      "High-volume automations",
      "8 team seats",
      "Priority support",
    ],
    overages: [
      { label: "Voice minutes", price: "$0.12/min" },
      { label: "SMS", price: "$6 per 500" },
      { label: "WhatsApp conversations", price: "$10 per 1,000 + provider fees" },
      { label: "Extra Homebase", price: "$49/mo" },
    ],
  },
];

export function getDoblyPlan(planId: DoblyPlanId | string | null | undefined) {
  const normalizedPlanId = planId === "business" ? "command" : planId;
  return DOBLY_PLANS.find((plan) => plan.id === normalizedPlanId) ?? DOBLY_PLANS[0];
}

export function canUseDepartment(planId: DoblyPlanId | string | null | undefined, departmentId: LaunchDepartmentId) {
  const plan = getDoblyPlan(planId);
  return plan.entitlements.includedDepartmentIds.includes(departmentId);
}

export function canUseChannel(planId: DoblyPlanId | string | null | undefined, channelId: BusinessChannelId) {
  const plan = getDoblyPlan(planId);
  return plan.entitlements.includedChannelIds.includes(channelId);
}
