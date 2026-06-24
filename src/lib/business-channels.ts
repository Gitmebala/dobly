export type BusinessChannelId =
  | "business_phone"
  | "business_sms"
  | "whatsapp_business"
  | "business_email"
  | "website_chat"
  | "calendar"
  | "crm"
  | "content_tools";

export type BusinessChannelStatus =
  | "not_connected"
  | "verification_required"
  | "approval_pending"
  | "ready_to_test"
  | "live"
  | "needs_attention";

export type BusinessChannelCapability =
  | "receive_calls"
  | "make_calls"
  | "send_sms"
  | "receive_sms"
  | "send_whatsapp"
  | "receive_whatsapp"
  | "send_chat"
  | "receive_chat"
  | "send_email"
  | "read_email"
  | "book_calendar"
  | "update_records"
  | "draft_content"
  | "publish_content";

export interface BusinessChannelDefinition {
  id: BusinessChannelId;
  title: string;
  plainName: string;
  departmentFit: string[];
  promise: string;
  userSteps: string[];
  doblySteps: string[];
  capabilities: BusinessChannelCapability[];
  setupModes: Array<{
    id: string;
    title: string;
    summary: string;
    recommended?: boolean;
  }>;
  importantNote?: string;
}

export interface BusinessChannelConnectionRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  channel_id: BusinessChannelId;
  display_name: string;
  external_identifier: string | null;
  status: BusinessChannelStatus;
  setup_mode: string | null;
  capabilities: BusinessChannelCapability[];
  user_steps: string[];
  dobly_steps: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const BUSINESS_CHANNELS: BusinessChannelDefinition[] = [
  {
    id: "business_phone",
    title: "Business Phone",
    plainName: "Calls",
    departmentFit: ["Reception", "Sales", "Support"],
    promise: "Use the lowest-cost Kenya-first phone path for inbound calls, callbacks, qualification, booking, and escalation.",
    userSteps: [
      "Enter the business phone number.",
      "Verify ownership with a call or code.",
      "Choose whether Dobly answers calls, makes calls, or both.",
      "Run a test call.",
      "Activate the department worker.",
    ],
    doblySteps: [
      "Checks number eligibility and the cheapest available local route.",
      "Sets up call routing or verified caller identity, with international fallback only when needed.",
      "Connects calls to the right department worker.",
      "Stores transcripts, summaries, lead fields, and escalations.",
      "Applies approval and handoff rules.",
    ],
    capabilities: ["receive_calls", "make_calls"],
    setupModes: [
      {
        id: "forwarding_plus_verified_caller_id",
        title: "Keep my number",
        summary: "Fastest path: verify the number, route inbound calls, and show the business number where supported.",
        recommended: true,
      },
      {
        id: "full_number_transfer",
        title: "Move number to Dobly",
        summary: "Full control for calls and messaging when the business is ready for a deeper setup.",
      },
      {
        id: "new_dobly_number",
        title: "Use a new number",
        summary: "Instant setup for new campaigns, locations, or departments.",
      },
    ],
    importantNote: "Dobly should hide telecom language and avoid defaulting to expensive international rails. The product experience is simply: connect, verify, test, activate.",
  },
  {
    id: "business_sms",
    title: "Business Texting",
    plainName: "SMS",
    departmentFit: ["Reception", "Sales", "Support", "Finance"],
    promise: "Send and receive low-cost local texts for follow-ups, reminders, support, and payment nudges.",
    userSteps: [
      "Enter the number that should send texts.",
      "Verify ownership.",
      "Confirm business details and message use.",
      "Approve example message language.",
      "Wait for texting approval if carriers require it.",
      "Send a test text.",
    ],
    doblySteps: [
      "Checks whether the number can support business texting.",
      "Configures hosted SMS or a messaging-capable number.",
      "Handles carrier registration and opt-out rules.",
      "Routes messages into Reception, Sales, Support, or Finance.",
      "Prevents unsafe or spammy sends.",
    ],
    capabilities: ["send_sms", "receive_sms"],
    setupModes: [
      {
        id: "hosted_sms",
        title: "Text from my existing number",
        summary: "Keep calls with the current carrier while Dobly handles texts where supported.",
        recommended: true,
      },
      {
        id: "sms_capable_dobly_number",
        title: "Use a messaging number",
        summary: "Fast fallback if the existing number cannot be text-enabled quickly.",
      },
    ],
    importantNote: "Some regions require carrier approval before business texting can go live.",
  },
  {
    id: "whatsapp_business",
    title: "WhatsApp Business",
    plainName: "WhatsApp",
    departmentFit: ["Reception", "Sales", "Support", "Marketing"],
    promise: "Let Dobly answer, qualify, follow up, and escalate through the business WhatsApp channel.",
    userSteps: [
      "Click Connect WhatsApp.",
      "Log in with Meta.",
      "Choose or create the business account.",
      "Choose or add the WhatsApp number.",
      "Verify the number with a code or call.",
      "Activate the WhatsApp Desk.",
    ],
    doblySteps: [
      "Runs the WhatsApp Business onboarding flow.",
      "Configures message webhooks.",
      "Creates safe outbound templates where needed.",
      "Connects conversations to department workers and memory.",
      "Routes sensitive conversations to approvals or handoff.",
    ],
    capabilities: ["send_whatsapp", "receive_whatsapp"],
    setupModes: [
      {
        id: "embedded_meta_onboarding",
        title: "Connect WhatsApp Business",
        summary: "Guided Meta login and number verification without exposing API setup.",
        recommended: true,
      },
      {
        id: "new_whatsapp_number",
        title: "Create a WhatsApp number",
        summary: "Fast option for new campaigns or teams that do not want to migrate an existing inbox.",
      },
    ],
    importantNote: "Dobly should say Connect WhatsApp, not WhatsApp Business Platform API.",
  },
  {
    id: "business_email",
    title: "Business Email",
    plainName: "Email",
    departmentFit: ["Reception", "Sales", "Support", "Marketing", "Finance"],
    promise: "Draft, send, organize, and follow up from the real Gmail or Outlook account with approval rules.",
    userSteps: [
      "Choose Gmail or Outlook.",
      "Sign in.",
      "Approve the permissions Dobly needs.",
      "Choose whether Dobly can draft only or send approved emails.",
      "Send a test email.",
    ],
    doblySteps: [
      "Stores OAuth access securely.",
      "Maps inbox activity to departments.",
      "Creates drafts and follow-ups using business memory.",
      "Sends only within the worker permission policy.",
      "Logs every action for audit and learning.",
    ],
    capabilities: ["send_email", "read_email"],
    setupModes: [
      {
        id: "oauth",
        title: "Connect Gmail or Outlook",
        summary: "Best default: the user signs in and Dobly acts through their real account.",
        recommended: true,
      },
      {
        id: "domain_sender",
        title: "Use business domain sender",
        summary: "For newsletters and transactional email using verified domain records.",
      },
    ],
  },
  {
    id: "website_chat",
    title: "Website Chat",
    plainName: "Website Chat",
    departmentFit: ["Reception", "Sales", "Support"],
    promise: "Embed a Dobly chatbot on the business website to answer questions, capture leads, and escalate issues.",
    userSteps: [
      "Copy the Dobly widget script.",
      "Add it to the website.",
      "Send a test message.",
      "Choose whether replies can send automatically or require approval.",
    ],
    doblySteps: [
      "Creates the public widget endpoint.",
      "Routes visitor messages into Reception, Sales, or Support.",
      "Uses business memory to draft replies.",
      "Creates approval tasks for risky conversations.",
      "Stores the interaction in Homebase.",
    ],
    capabilities: ["send_chat", "receive_chat"],
    setupModes: [
      {
        id: "dobly_widget",
        title: "Embed Dobly widget",
        summary: "Add one script tag to the site and route conversations into Homebase.",
        recommended: true,
      },
    ],
  },
  {
    id: "calendar",
    title: "Calendar",
    plainName: "Calendar",
    departmentFit: ["Reception", "Sales", "Support", "Operations"],
    promise: "Book meetings, check availability, reschedule appointments, and send reminders.",
    userSteps: ["Sign in with Google or Microsoft.", "Approve calendar permissions.", "Choose booking rules.", "Run a booking test."],
    doblySteps: ["Reads availability.", "Books and updates events.", "Sends reminders.", "Escalates conflicts."],
    capabilities: ["book_calendar"],
    setupModes: [{ id: "oauth", title: "Connect Calendar", summary: "Use the business calendar directly.", recommended: true }],
  },
  {
    id: "crm",
    title: "CRM",
    plainName: "CRM",
    departmentFit: ["Reception", "Sales", "Support"],
    promise: "Create leads, update customer records, log calls, and keep pipeline context current.",
    userSteps: ["Choose CRM.", "Sign in or provide API access.", "Choose which records Dobly can update.", "Run a test lead sync."],
    doblySteps: ["Maps fields.", "Creates and updates records.", "Logs activity.", "Keeps follow-up state in sync."],
    capabilities: ["update_records"],
    setupModes: [{ id: "oauth_or_api_key", title: "Connect CRM", summary: "Start with HubSpot, then expand.", recommended: true }],
  },
  {
    id: "content_tools",
    title: "Content Tools",
    plainName: "Content",
    departmentFit: ["Marketing"],
    promise: "Draft campaigns, reuse brand memory, prepare Canva assets, and route content to approval before publishing.",
    userSteps: ["Connect Notion, Canva, or social tools.", "Choose brand assets.", "Set approval rules.", "Run a content test."],
    doblySteps: ["Builds content memory.", "Drafts campaigns.", "Prepares assets or handoffs.", "Routes approvals before publishing."],
    capabilities: ["draft_content", "publish_content"],
    setupModes: [{ id: "tool_connections", title: "Connect content stack", summary: "Notion, Canva, social, and email campaign tools.", recommended: true }],
  },
];

export function getBusinessChannelDefinition(channelId: BusinessChannelId) {
  return BUSINESS_CHANNELS.find((channel) => channel.id === channelId) ?? null;
}

export function createBusinessChannelSetupSnapshot(params: {
  channelId: BusinessChannelId;
  displayName?: string;
  externalIdentifier?: string | null;
  setupMode?: string | null;
}) {
  const definition = getBusinessChannelDefinition(params.channelId);
  if (!definition) {
    throw new Error("Unknown business channel.");
  }

  const setupMode = params.setupMode ?? definition.setupModes.find((mode) => mode.recommended)?.id ?? definition.setupModes[0]?.id ?? null;

  return {
    channel_id: definition.id,
    display_name: params.displayName?.trim() || definition.title,
    external_identifier: params.externalIdentifier?.trim() || null,
    status: "verification_required" as BusinessChannelStatus,
    setup_mode: setupMode,
    capabilities: definition.capabilities,
    user_steps: definition.userSteps,
    dobly_steps: definition.doblySteps,
    metadata: {
      departmentFit: definition.departmentFit,
      promise: definition.promise,
      importantNote: definition.importantNote ?? null,
      setupModes: definition.setupModes,
    },
  };
}
