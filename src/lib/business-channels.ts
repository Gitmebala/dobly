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
    promise: "Dobly answers calls, calls back, qualifies, books, and knows when to hand off — on the cheapest reliable route for the number you connect.",
    userSteps: [
      "Enter the business phone number.",
      "Verify ownership with a call or code.",
      "Choose whether Dobly answers calls, makes calls, or both.",
      "Run a test call.",
      "Activate the department worker.",
    ],
    doblySteps: [
      "Finds the cheapest route that number can use.",
      "Sets up call routing, keeping the business number where it can.",
      "Sends calls to the right coworker.",
      "Keeps a transcript, summary, and any lead details from every call.",
      "Asks before anything risky goes out.",
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
      "Checks whether that number can text.",
      "Sets up texting on it, or a messaging number if it can't.",
      "Handles carrier registration and opt-outs.",
      "Sends messages to the right coworker.",
      "Won't send anything that looks unsafe or spammy.",
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
      "Walks through WhatsApp's own setup for you.",
      "Wires up the messages to actually reach Dobly.",
      "Writes approved reply templates where WhatsApp requires them.",
      "Connects conversations to the right coworker and its memory.",
      "Flags anything sensitive for your approval instead of replying on its own.",
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
      "Keeps that sign-in secure.",
      "Sends inbox activity to the right coworker.",
      "Drafts replies and follow-ups using what it knows about the business.",
      "Only sends what you've given it permission to send.",
      "Keeps a record of every email it touches.",
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
      "Turns that script into a working chat widget.",
      "Sends visitor messages to the right coworker.",
      "Drafts replies using what it knows about the business.",
      "Holds risky conversations for your approval.",
      "Keeps a record of every conversation.",
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
    doblySteps: ["Checks what's open.", "Books and updates events for you.", "Sends reminders before they happen.", "Flags anything that conflicts."],
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
    doblySteps: ["Matches your fields to the CRM's.", "Creates and updates records for you.", "Logs every call and message.", "Keeps follow-ups in sync automatically."],
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
    doblySteps: ["Remembers the brand voice and past campaigns.", "Drafts new campaigns from that.", "Prepares the assets or hands them off.", "Sends everything to you for approval before it publishes."],
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
