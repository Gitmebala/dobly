import "server-only";

export type DoblyCapability =
  | "research_sources"
  | "create_visual_design"
  | "create_3d_cad"
  | "create_animation"
  | "edit_visual_design"
  | "generate_media"
  | "build_chatbot"
  | "summarize_knowledge"
  | "publish_content"
  | "manage_project_tasks"
  | "update_crm"
  | "create_invoice"
  | "collect_payment"
  | "reconcile_finance"
  | "manage_commerce"
  | "operate_browser"
  | "edit_codebase"
  | "create_document"
  | "edit_spreadsheet"
  | "manage_calendar"
  | "send_message"
  | "monitor_market"
  | "book_travel"
  | "operate_software";

export interface CapabilityDefinition {
  id: DoblyCapability;
  label: string;
  aliases: string[];
  riskLevel: "low" | "medium" | "high";
}

export const DOBLY_CAPABILITIES: CapabilityDefinition[] = [
  { id: "research_sources", label: "Research sources", aliases: ["research", "find", "compare", "look up", "investigate", "sources"], riskLevel: "low" },
  { id: "create_visual_design", label: "Create visual design", aliases: ["design", "graphic", "poster", "canva", "creative", "brand asset", "thumbnail"], riskLevel: "medium" },
  { id: "create_3d_cad", label: "Create 3D/CAD design", aliases: ["cad", "3d model", "3d design", "industrial design", "product model", "fusion 360", "autodesk", "blender", "blueprint", "render"], riskLevel: "medium" },
  { id: "create_animation", label: "Create animation", aliases: ["animation", "animate", "motion graphics", "storyboard", "rig", "animatic"], riskLevel: "medium" },
  { id: "edit_visual_design", label: "Edit visual design", aliases: ["resize", "edit design", "revise design", "template"], riskLevel: "medium" },
  { id: "generate_media", label: "Generate media", aliases: ["video", "image", "voiceover", "reel", "carousel", "media"], riskLevel: "medium" },
  { id: "build_chatbot", label: "Build chatbot", aliases: ["chatbot", "website bot", "site bot", "web chat", "support bot", "assistant widget"], riskLevel: "high" },
  { id: "summarize_knowledge", label: "Summarize knowledge", aliases: ["summarize", "summarise", "digest", "condense", "notes", "brief", "transcript summary", "executive summary"], riskLevel: "low" },
  { id: "publish_content", label: "Publish content", aliases: ["publish", "post", "schedule post", "social", "upload"], riskLevel: "high" },
  { id: "manage_project_tasks", label: "Manage project tasks", aliases: ["task", "project", "asana", "trello", "linear", "assign", "status"], riskLevel: "medium" },
  { id: "update_crm", label: "Update CRM", aliases: ["crm", "lead", "pipeline", "deal", "customer record"], riskLevel: "medium" },
  { id: "create_invoice", label: "Create invoice", aliases: ["invoice", "bill customer", "quote"], riskLevel: "high" },
  { id: "collect_payment", label: "Collect payment", aliases: ["payment", "charge", "stk", "pay", "checkout"], riskLevel: "high" },
  { id: "reconcile_finance", label: "Reconcile finance", aliases: ["reconcile", "accounting", "xero", "quickbooks", "expense"], riskLevel: "high" },
  { id: "manage_commerce", label: "Manage commerce", aliases: ["order", "inventory", "shopify", "product listing", "fulfillment"], riskLevel: "high" },
  { id: "operate_browser", label: "Operate browser", aliases: ["portal", "browser", "log into", "website admin", "dashboard"], riskLevel: "high" },
  { id: "edit_codebase", label: "Edit codebase", aliases: ["code", "github", "repo", "pull request", "bug", "commit"], riskLevel: "high" },
  { id: "create_document", label: "Create document", aliases: ["document", "doc", "proposal", "contract", "spec", "report"], riskLevel: "medium" },
  { id: "edit_spreadsheet", label: "Edit spreadsheet", aliases: ["spreadsheet", "sheet", "excel", "forecast", "model"], riskLevel: "medium" },
  { id: "manage_calendar", label: "Manage calendar", aliases: ["calendar", "meeting", "appointment", "schedule"], riskLevel: "medium" },
  { id: "send_message", label: "Send message", aliases: ["email", "message", "send", "whatsapp", "sms"], riskLevel: "high" },
  { id: "monitor_market", label: "Monitor market", aliases: ["stock", "crypto", "market", "price", "coindesk", "coinbase"], riskLevel: "medium" },
  { id: "book_travel", label: "Book travel", aliases: ["flight", "hotel", "trip", "travel", "itinerary"], riskLevel: "high" },
  { id: "operate_software", label: "Operate software", aliases: ["use app", "operate", "software", "account", "workspace"], riskLevel: "high" },
];

export function inferCapabilitiesFromText(text: string) {
  const lower = text.toLowerCase();
  const matches = DOBLY_CAPABILITIES.filter((capability) =>
    capability.aliases.some((alias) => lower.includes(alias)),
  ).map((capability) => capability.id);

  return Array.from(new Set(matches.length ? matches : ["research_sources"]));
}

export function getCapabilityDefinition(capability: string) {
  return DOBLY_CAPABILITIES.find((item) => item.id === capability);
}
