import { findOperationalConnection } from "@/lib/connection-readiness";
import { getConnectionProvider } from "@/lib/connection-catalog";
import type { Connection } from "@/types";

export type CapabilityProviderKind = "internal" | "user_connection" | "platform_provider" | "tool_gateway";
export type CapabilityReadiness = "available_now" | "connect_app" | "configure_platform" | "coming_later";

export interface CapabilityProviderOption {
  id: string;
  label: string;
  kind: CapabilityProviderKind;
  userFacingAction: string;
  env?: string[];
  connectionProviderId?: string;
  gatewayToolId?: string;
  launchPriority?: number;
}

export interface CoworkerCapabilityDefinition {
  id: string;
  label: string;
  plainLanguage: string;
  coworkerExamples: string[];
  keywords: string[];
  providerOptions: CapabilityProviderOption[];
  fallback?: string;
}

export interface CoworkerCapabilityStatus {
  id: string;
  label: string;
  plainLanguage: string;
  readiness: CapabilityReadiness;
  userMessage: string;
  nextAction: string | null;
  activeProvider: CapabilityProviderOption | null;
  providerOptions: CapabilityProviderOption[];
  missingPlatformEnv: string[];
  coworkerExamples: string[];
}

function envPresent(names: string[] | undefined) {
  if (!names?.length) return true;
  return names.every((name) => Boolean(process.env[name]));
}

const CORE_AI_ENV = ["ANTHROPIC_API_KEY"];
const TOOL_GATEWAY_ENV = ["DOBLY_TOOL_GATEWAY_URL", "DOBLY_TOOL_GATEWAY_TOKEN"];

export const COWORKER_CAPABILITIES: CoworkerCapabilityDefinition[] = [
  {
    id: "write_and_plan",
    label: "Write, plan, and reason",
    plainLanguage: "Coworkers can draft, summarize, plan, classify, organize, and explain work inside their own chat.",
    coworkerExamples: ["Admin coworker", "Strategy coworker", "Planning coworker", "Content coworker"],
    keywords: ["write", "draft", "plan", "summarize", "strategy", "caption", "proposal", "script"],
    providerOptions: [
      {
        id: "anthropic-core",
        label: "Dobly AI core",
        kind: "platform_provider",
        env: CORE_AI_ENV,
        userFacingAction: "Dobly handles this automatically.",
        launchPriority: 1,
      },
    ],
  },
  {
    id: "research",
    label: "Research",
    plainLanguage: "Coworkers can research markets, competitors, vendors, trends, and questions, then turn findings into a brief.",
    coworkerExamples: ["Market research coworker", "Competitor watcher", "Vendor research coworker"],
    keywords: ["research", "market", "competitor", "trend", "vendor", "compare", "watch"],
    providerOptions: [
      {
        id: "anthropic-research",
        label: "Dobly research stack",
        kind: "platform_provider",
        env: CORE_AI_ENV,
        userFacingAction: "Dobly handles this automatically.",
        launchPriority: 1,
      },
      {
        id: "web-tool-gateway",
        label: "Dobly web research tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "web_research",
        userFacingAction: "Dobly will use its research tool gateway when available.",
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    plainLanguage: "Coworkers can create docs, briefs, reports, policies, SOPs, and proposals.",
    coworkerExamples: ["Docs coworker", "Proposal coworker", "Ops SOP coworker"],
    keywords: ["document", "doc", "proposal", "report", "brief", "sop", "policy"],
    providerOptions: [
      {
        id: "google-docs",
        label: "Google Docs",
        kind: "user_connection",
        connectionProviderId: "google",
        userFacingAction: "Connect Google so this coworker can create and organize documents.",
        launchPriority: 1,
      },
      {
        id: "document-tool-gateway",
        label: "Dobly document tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "document_production",
        userFacingAction: "Dobly can use its document tool gateway when configured.",
      },
    ],
    fallback: "Dobly can draft the document in chat until Google Docs or the document tool is available.",
  },
  {
    id: "calendar",
    label: "Calendar and scheduling",
    plainLanguage: "Coworkers can schedule meetings, reminders, booking holds, follow-ups, and routines.",
    coworkerExamples: ["Scheduling coworker", "Reception coworker", "Personal planning coworker"],
    keywords: ["calendar", "schedule", "appointment", "booking", "meeting", "reminder", "follow up"],
    providerOptions: [
      {
        id: "google-calendar",
        label: "Google Calendar",
        kind: "user_connection",
        connectionProviderId: "google",
        userFacingAction: "Connect Google Calendar so this coworker can schedule and update events.",
        launchPriority: 1,
      },
    ],
    fallback: "Dobly can prepare the booking details and ask you to confirm manually until a calendar is connected.",
  },
  {
    id: "email",
    label: "Email",
    plainLanguage: "Coworkers can draft and send email replies, follow-ups, updates, and reports.",
    coworkerExamples: ["Sales follow-up coworker", "Support email coworker", "Founder briefing coworker"],
    keywords: ["email", "gmail", "reply", "send", "inbox", "follow-up"],
    providerOptions: [
      {
        id: "gmail",
        label: "Gmail",
        kind: "user_connection",
        connectionProviderId: "google",
        userFacingAction: "Connect Google so this coworker can send from Gmail.",
        launchPriority: 1,
      },
      {
        id: "resend",
        label: "Dobly email delivery",
        kind: "platform_provider",
        env: ["RESEND_API_KEY", "EMAIL_FROM"],
        userFacingAction: "Dobly can send platform emails when configured.",
      },
    ],
    fallback: "Dobly can draft email text in chat until an inbox or Dobly email delivery is connected.",
  },
  {
    id: "design",
    label: "Designs",
    plainLanguage: "Coworkers can create brand assets, social graphics, slides, and editable Canva work.",
    coworkerExamples: ["Marketing design coworker", "Social content coworker", "Presentation coworker"],
    keywords: ["design", "canva", "graphic", "slide", "presentation", "poster", "creative", "asset"],
    providerOptions: [
      {
        id: "canva",
        label: "Canva",
        kind: "user_connection",
        connectionProviderId: "canva",
        userFacingAction: "Connect Canva so this coworker can create editable designs.",
        launchPriority: 1,
      },
      {
        id: "media-tool-gateway",
        label: "Dobly creative media tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "creative_media_ops",
        userFacingAction: "Dobly can use its creative media tool gateway when configured.",
      },
      {
        id: "openai-image",
        label: "Image generation",
        kind: "platform_provider",
        env: ["OPENAI_API_KEY"],
        userFacingAction: "Dobly can generate flat images when image generation is configured.",
      },
    ],
    fallback: "Dobly can draft the concept, copy, and layout brief until Canva or a creative tool is connected.",
  },
  {
    id: "video",
    label: "Video",
    plainLanguage: "Coworkers can create short videos, reels, scripts, captions, and campaign video drafts.",
    coworkerExamples: ["Video coworker", "Social media coworker", "Launch campaign coworker"],
    keywords: ["video", "reel", "short", "caption", "voiceover", "remotion", "tiktok"],
    providerOptions: [
      {
        id: "video-tool-gateway",
        label: "Dobly video tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "creative_media_ops",
        userFacingAction: "Dobly can use its video tool gateway when configured.",
        launchPriority: 1,
      },
      {
        id: "remotion-runtime",
        label: "Dobly video renderer",
        kind: "platform_provider",
        env: ["REMOTION_AWS_ACCESS_KEY_ID", "REMOTION_AWS_SECRET_ACCESS_KEY"],
        userFacingAction: "Dobly can render videos when the video renderer is configured.",
      },
    ],
    fallback: "Dobly can write the script, shot plan, captions, and storyboard until rendering is available.",
  },
  {
    id: "voice",
    label: "Voice",
    plainLanguage: "Coworkers can speak naturally for calls, voice notes, demos, and narrated deliverables.",
    coworkerExamples: ["Reception coworker", "Voice briefing coworker", "Narration coworker"],
    keywords: ["voice", "speak", "tts", "elevenlabs", "call", "narrate", "audio"],
    providerOptions: [
      {
        id: "elevenlabs",
        label: "ElevenLabs",
        kind: "platform_provider",
        env: ["ELEVENLABS_API_KEY"],
        userFacingAction: "Dobly handles voice generation when ElevenLabs is configured.",
        launchPriority: 1,
      },
    ],
    fallback: "Dobly can write call scripts and voice replies until voice generation is configured.",
  },
  {
    id: "calls_sms",
    label: "Calls and SMS",
    plainLanguage: "Coworkers can answer calls, recover missed calls, send SMS, and help run Reception.",
    coworkerExamples: ["Reception coworker", "Bookings coworker", "Customer follow-up coworker"],
    keywords: ["call", "phone", "sms", "reception", "missed call", "number"],
    providerOptions: [
      {
        id: "kenya-local-comms",
        label: "Kenya Calls & SMS",
        kind: "user_connection",
        connectionProviderId: "kenya_local_comms",
        userFacingAction: "Set up Kenya Calls & SMS so this coworker can use a business number.",
        launchPriority: 1,
      },
      {
        id: "local-comms-platform",
        label: "Dobly local voice/SMS provider",
        kind: "platform_provider",
        env: ["LOCAL_VOICE_SMS_BASE_URL", "LOCAL_VOICE_SMS_API_KEY", "LOCAL_VOICE_SMS_API_SECRET"],
        userFacingAction: "Dobly handles local phone routing when the provider is configured.",
      },
      {
        id: "twilio",
        label: "Twilio international fallback",
        kind: "platform_provider",
        env: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
        userFacingAction: "Dobly can use Twilio for international routes when configured.",
      },
    ],
    fallback: "Dobly can prepare Reception scripts and follow-up logic until the number is connected.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    plainLanguage: "Coworkers can send customer confirmations, reminders, support replies, and approval messages.",
    coworkerExamples: ["Support coworker", "Bookings coworker", "Payments follow-up coworker"],
    keywords: ["whatsapp", "message", "customer message", "confirmation", "reminder"],
    providerOptions: [
      {
        id: "whatsapp-business",
        label: "WhatsApp Business",
        kind: "user_connection",
        connectionProviderId: "whatsapp",
        userFacingAction: "Connect WhatsApp Business so this coworker can message customers.",
        launchPriority: 1,
      },
      {
        id: "meta-platform",
        label: "Meta platform",
        kind: "platform_provider",
        env: ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN"],
        userFacingAction: "Dobly handles WhatsApp webhooks when Meta is configured.",
      },
    ],
    fallback: "Dobly can draft WhatsApp replies until WhatsApp is connected.",
  },
  {
    id: "payments",
    label: "Payments",
    plainLanguage: "Coworkers can create payment links, follow up, check status, and attach payment context to customer work.",
    coworkerExamples: ["Finance coworker", "Collections coworker", "Bookings payment coworker"],
    keywords: ["payment", "paystack", "mpesa", "m-pesa", "invoice", "paid", "checkout", "deposit"],
    providerOptions: [
      {
        id: "paystack",
        label: "Paystack",
        kind: "user_connection",
        connectionProviderId: "paystack",
        userFacingAction: "Connect Paystack so this coworker can create payment links and check payments.",
        launchPriority: 1,
      },
      {
        id: "mpesa",
        label: "M-PESA",
        kind: "user_connection",
        connectionProviderId: "mpesa",
        userFacingAction: "Connect M-PESA so this coworker can use supported Daraja payment actions.",
        launchPriority: 2,
      },
    ],
    fallback: "Dobly can prepare payment reminders and collection flows until payments are connected.",
  },
  {
    id: "social",
    label: "Social publishing",
    plainLanguage: "Coworkers can draft, schedule, monitor, and publish content with approval.",
    coworkerExamples: ["Social coworker", "Campaign coworker", "Community coworker"],
    keywords: ["social", "instagram", "facebook", "linkedin", "post", "publish", "campaign"],
    providerOptions: [
      {
        id: "meta",
        label: "Meta / Instagram",
        kind: "user_connection",
        connectionProviderId: "meta",
        userFacingAction: "Connect Meta so this coworker can publish or monitor Instagram and Facebook.",
        launchPriority: 1,
      },
      {
        id: "social-tool-gateway",
        label: "Dobly social tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "social_publishing_ops",
        userFacingAction: "Dobly can use its social publishing tool gateway when configured.",
      },
    ],
    fallback: "Dobly can draft and queue social content until publishing is connected.",
  },
  {
    id: "crm_sales",
    label: "CRM and sales",
    plainLanguage: "Coworkers can track leads, update deals, prepare proposals, and keep sales follow-up moving.",
    coworkerExamples: ["Sales coworker", "Pipeline coworker", "Proposal coworker"],
    keywords: ["crm", "lead", "deal", "sales", "pipeline", "hubspot", "customer"],
    providerOptions: [
      {
        id: "hubspot",
        label: "HubSpot",
        kind: "user_connection",
        connectionProviderId: "hubspot",
        userFacingAction: "Connect HubSpot so this coworker can manage contacts, deals, notes, and tasks.",
        launchPriority: 1,
      },
      {
        id: "crm-tool-gateway",
        label: "Dobly CRM tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "crm_sales_ops",
        userFacingAction: "Dobly can use its CRM tool gateway when configured.",
      },
    ],
    fallback: "Dobly can track sales work in chat until a CRM is connected.",
  },
  {
    id: "project_ops",
    label: "Projects and operations",
    plainLanguage: "Coworkers can create tasks, track blockers, chase handoffs, coordinate suppliers, and keep projects moving.",
    coworkerExamples: ["Project coordinator coworker", "Operations coworker", "Supplier follow-up coworker"],
    keywords: ["project", "task", "operations", "supplier", "handoff", "blocker", "asana", "trello", "jira", "linear", "clickup"],
    providerOptions: [
      {
        id: "google-workspace",
        label: "Google Workspace",
        kind: "user_connection",
        connectionProviderId: "google",
        userFacingAction: "Connect Google so this coworker can coordinate docs, calendars, and operational follow-up.",
        launchPriority: 1,
      },
      {
        id: "project-tool-gateway",
        label: "Dobly project tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "project_ops",
        userFacingAction: "Dobly can use its project tool gateway when configured.",
      },
    ],
    fallback: "Dobly can track tasks, blockers, and follow-ups in chat until a project tool is connected.",
  },
  {
    id: "engineering_delivery",
    label: "Engineering and product delivery",
    plainLanguage: "Coworkers can triage issues, package customer feedback, prepare QA, draft release notes, and coordinate product delivery.",
    coworkerExamples: ["Engineering coworker", "Product triage coworker", "QA release coworker"],
    keywords: ["engineering", "product", "github", "code", "issue", "bug", "qa", "release", "docs", "technical"],
    providerOptions: [
      {
        id: "github",
        label: "GitHub",
        kind: "user_connection",
        connectionProviderId: "github",
        userFacingAction: "Connect GitHub so this coworker can inspect repos, issues, and release work.",
        launchPriority: 1,
      },
      {
        id: "github-tool-gateway",
        label: "Dobly engineering tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "github_repo_ops",
        userFacingAction: "Dobly can use its engineering tool gateway when configured.",
      },
    ],
    fallback: "Dobly can prepare technical briefs, QA plans, and release notes until GitHub or an engineering tool is connected.",
  },
  {
    id: "analytics_reporting",
    label: "Analytics and reporting",
    plainLanguage: "Coworkers can watch signals, explain changes, create reports, and surface risks or opportunities.",
    coworkerExamples: ["Analytics coworker", "Board briefing coworker", "Signal watcher"],
    keywords: ["analytics", "report", "dashboard", "data", "metric", "kpi", "anomaly", "spreadsheet", "board"],
    providerOptions: [
      {
        id: "google-sheets",
        label: "Google Sheets",
        kind: "user_connection",
        connectionProviderId: "google",
        userFacingAction: "Connect Google so this coworker can read sheets and create reports.",
        launchPriority: 1,
      },
      {
        id: "data-tool-gateway",
        label: "Dobly data tool",
        kind: "tool_gateway",
        env: TOOL_GATEWAY_ENV,
        gatewayToolId: "data_analytics_ops",
        userFacingAction: "Dobly can use its data analytics tool gateway when configured.",
      },
    ],
    fallback: "Dobly can create manual briefs and analysis frameworks until live data sources are connected.",
  },
];

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function isString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function providerIsConnected(option: CapabilityProviderOption, connections: Connection[]) {
  return option.connectionProviderId ? Boolean(findOperationalConnection(connections, option.connectionProviderId)) : false;
}

function optionIsAvailable(option: CapabilityProviderOption, connections: Connection[]) {
  if (option.kind === "internal") return true;
  if (option.kind === "user_connection") return providerIsConnected(option, connections);
  return envPresent(option.env);
}

function friendlyConnectAction(option: CapabilityProviderOption) {
  if (!option.connectionProviderId) return option.userFacingAction;
  const provider = getConnectionProvider(option.connectionProviderId);
  return provider ? `Connect ${provider.label}` : option.userFacingAction;
}

export function resolveCoworkerCapabilityStatus(
  capability: CoworkerCapabilityDefinition,
  connections: Connection[] = [],
): CoworkerCapabilityStatus {
  const sortedOptions = [...capability.providerOptions].sort(
    (a, b) => (a.launchPriority ?? 99) - (b.launchPriority ?? 99),
  );
  const activeProvider = sortedOptions.find((option) => optionIsAvailable(option, connections)) ?? null;
  if (activeProvider) {
    return {
      id: capability.id,
      label: capability.label,
      plainLanguage: capability.plainLanguage,
      readiness: "available_now",
      userMessage: `${capability.label} is ready through ${activeProvider.label}.`,
      nextAction: null,
      activeProvider,
      providerOptions: sortedOptions,
      missingPlatformEnv: [],
      coworkerExamples: capability.coworkerExamples,
    };
  }

  const userOption = sortedOptions.find((option) => option.kind === "user_connection");
  if (userOption) {
    return {
      id: capability.id,
      label: capability.label,
      plainLanguage: capability.plainLanguage,
      readiness: "connect_app",
      userMessage: userOption.userFacingAction,
      nextAction: friendlyConnectAction(userOption),
      activeProvider: null,
      providerOptions: sortedOptions,
      missingPlatformEnv: [],
      coworkerExamples: capability.coworkerExamples,
    };
  }

  const platformOption = sortedOptions.find((option) => option.env?.length);
  if (platformOption) {
    return {
      id: capability.id,
      label: capability.label,
      plainLanguage: capability.plainLanguage,
      readiness: "configure_platform",
      userMessage: capability.fallback ?? `${capability.label} is not available yet.`,
      nextAction: "Dobly platform setup required",
      activeProvider: null,
      providerOptions: sortedOptions,
      missingPlatformEnv: platformOption.env?.filter((name) => !process.env[name]) ?? [],
      coworkerExamples: capability.coworkerExamples,
    };
  }

  return {
    id: capability.id,
    label: capability.label,
    plainLanguage: capability.plainLanguage,
    readiness: "coming_later",
    userMessage: capability.fallback ?? `${capability.label} is coming later.`,
    nextAction: null,
    activeProvider: null,
    providerOptions: sortedOptions,
    missingPlatformEnv: [],
    coworkerExamples: capability.coworkerExamples,
  };
}

export function resolveCoworkerCapabilities(input: {
  prompt: string;
  connections?: Connection[];
  includeAll?: boolean;
}) {
  const normalizedPrompt = normalize(input.prompt);
  const matched = input.includeAll
    ? COWORKER_CAPABILITIES
    : COWORKER_CAPABILITIES.filter((capability) =>
        capability.keywords.some((keyword) => normalizedPrompt.includes(keyword)),
      );
  const capabilities = (matched.length ? matched : COWORKER_CAPABILITIES.slice(0, 4)).map((capability) =>
    resolveCoworkerCapabilityStatus(capability, input.connections ?? []),
  );

  return {
    capabilities,
    requiredConnectionProviderIds: Array.from(
      new Set(
        capabilities
          .filter((item) => item.readiness === "connect_app")
          .flatMap((item) => item.providerOptions.map((option) => option.connectionProviderId).filter(isString)),
      ),
    ),
    missingPlatformEnv: Array.from(new Set(capabilities.flatMap((item) => item.missingPlatformEnv))),
  };
}
