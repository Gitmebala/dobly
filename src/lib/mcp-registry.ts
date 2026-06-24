export type ClaudeMcpRiskLevel = "low" | "medium" | "high";
export type ClaudeMcpCapabilityFamily =
  | "design"
  | "engineering"
  | "code"
  | "documents"
  | "spreadsheets"
  | "data"
  | "browser"
  | "commerce"
  | "crm"
  | "finance"
  | "marketing"
  | "media"
  | "travel"
  | "personal"
  | "custom";

export interface ClaudeMcpToolDefinition {
  id: string;
  label: string;
  provider: "anthropic_mcp";
  family: ClaudeMcpCapabilityFamily;
  serverUrlEnv: string;
  authTokenEnv?: string;
  description: string;
  appropriateFor: string[];
  outputType:
    | "design_file"
    | "code_change"
    | "cad_model"
    | "document"
    | "spreadsheet"
    | "dataset"
    | "browser_result"
    | "commerce_record"
    | "crm_record"
    | "financial_record"
    | "media_asset"
    | "travel_plan"
    | "generic_artifact";
  riskLevel: ClaudeMcpRiskLevel;
  approvalRequired: boolean;
  recommendedModel?: string;
}

const BUILT_IN_CLAUDE_MCP_TOOLS: ClaudeMcpToolDefinition[] = [
  {
    id: "figma_design",
    label: "Figma Design",
    provider: "anthropic_mcp",
    family: "design",
    serverUrlEnv: "ANTHROPIC_MCP_FIGMA_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_FIGMA_AUTH_TOKEN",
    description: "Create or modify design work inside Figma through Claude MCP.",
    appropriateFor: ["wireframes", "ui mockups", "design systems", "screen revisions"],
    outputType: "design_file",
    riskLevel: "medium",
    approvalRequired: true,
  },
  {
    id: "github_repo_ops",
    label: "GitHub Repository Operations",
    provider: "anthropic_mcp",
    family: "code",
    serverUrlEnv: "ANTHROPIC_MCP_GITHUB_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_GITHUB_AUTH_TOKEN",
    description: "Inspect, edit, and prepare repository changes through GitHub MCP tools.",
    appropriateFor: ["code changes", "issue triage", "documentation updates", "repository maintenance"],
    outputType: "code_change",
    riskLevel: "high",
    approvalRequired: true,
  },
  {
    id: "fusion_modeling",
    label: "Autodesk Fusion Modeling",
    provider: "anthropic_mcp",
    family: "engineering",
    serverUrlEnv: "ANTHROPIC_MCP_FUSION_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_FUSION_AUTH_TOKEN",
    description: "Create or update engineering models in Autodesk Fusion through Claude MCP.",
    appropriateFor: ["cad modeling", "mechanical design", "component revisions", "design variants"],
    outputType: "cad_model",
    riskLevel: "high",
    approvalRequired: true,
  },
  {
    id: "notion_workspace_ops",
    label: "Notion Workspace Operations",
    provider: "anthropic_mcp",
    family: "documents",
    serverUrlEnv: "ANTHROPIC_MCP_NOTION_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_NOTION_AUTH_TOKEN",
    description: "Create or update pages and workspace records in Notion through Claude MCP.",
    appropriateFor: ["docs", "knowledge updates", "workspace organization", "structured notes"],
    outputType: "document",
    riskLevel: "medium",
    approvalRequired: false,
  },
  {
    id: "browser_software_ops",
    label: "Browser Software Operations",
    provider: "anthropic_mcp",
    family: "browser",
    serverUrlEnv: "ANTHROPIC_MCP_BROWSER_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_BROWSER_AUTH_TOKEN",
    description: "Operate browser-based software and portals when a structured API is not available.",
    appropriateFor: ["portals", "admin panels", "back offices", "forms", "research workflows"],
    outputType: "browser_result",
    riskLevel: "high",
    approvalRequired: true,
  },
  {
    id: "spreadsheet_modeling",
    label: "Spreadsheet Modeling",
    provider: "anthropic_mcp",
    family: "spreadsheets",
    serverUrlEnv: "ANTHROPIC_MCP_SPREADSHEET_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_SPREADSHEET_AUTH_TOKEN",
    description: "Build, inspect, and update workbook models, forecasts, trackers, and operating sheets.",
    appropriateFor: ["financial models", "forecasts", "trackers", "analysis sheets", "data cleanup"],
    outputType: "spreadsheet",
    riskLevel: "medium",
    approvalRequired: true,
  },
  {
    id: "document_production",
    label: "Document Production",
    provider: "anthropic_mcp",
    family: "documents",
    serverUrlEnv: "ANTHROPIC_MCP_DOCUMENT_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_DOCUMENT_AUTH_TOKEN",
    description: "Create, revise, redline, and package structured documents through connected document tools.",
    appropriateFor: ["proposals", "contracts", "reports", "briefs", "manuals", "policies"],
    outputType: "document",
    riskLevel: "medium",
    approvalRequired: true,
  },
  {
    id: "data_analytics_ops",
    label: "Data Analytics Operations",
    provider: "anthropic_mcp",
    family: "data",
    serverUrlEnv: "ANTHROPIC_MCP_DATA_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_DATA_AUTH_TOKEN",
    description: "Query, transform, inspect, and summarize structured datasets and analytics tools.",
    appropriateFor: ["dashboards", "sql analysis", "dataset summaries", "metric investigations"],
    outputType: "dataset",
    riskLevel: "medium",
    approvalRequired: false,
  },
  {
    id: "creative_media_ops",
    label: "Creative Media Operations",
    provider: "anthropic_mcp",
    family: "media",
    serverUrlEnv: "ANTHROPIC_MCP_MEDIA_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_MEDIA_AUTH_TOKEN",
    description: "Drive creative production tools for images, videos, templates, voiceovers, and campaign assets.",
    appropriateFor: ["video edits", "creative variants", "voiceover packages", "asset resizing", "campaign media"],
    outputType: "media_asset",
    riskLevel: "medium",
    approvalRequired: true,
  },
  {
    id: "social_publishing_ops",
    label: "Social Publishing Operations",
    provider: "anthropic_mcp",
    family: "marketing",
    serverUrlEnv: "ANTHROPIC_MCP_SOCIAL_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_SOCIAL_AUTH_TOKEN",
    description: "Prepare, schedule, and publish social content through connected publishing platforms.",
    appropriateFor: ["cross-platform posts", "content calendars", "campaign scheduling", "performance collection"],
    outputType: "generic_artifact",
    riskLevel: "high",
    approvalRequired: true,
  },
  {
    id: "crm_sales_ops",
    label: "CRM and Sales Operations",
    provider: "anthropic_mcp",
    family: "crm",
    serverUrlEnv: "ANTHROPIC_MCP_CRM_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_CRM_AUTH_TOKEN",
    description: "Operate sales records, pipelines, notes, lead updates, and account workflows.",
    appropriateFor: ["pipeline updates", "lead records", "account research", "sales notes", "follow-up prep"],
    outputType: "crm_record",
    riskLevel: "medium",
    approvalRequired: true,
  },
  {
    id: "commerce_backoffice_ops",
    label: "Commerce Back Office Operations",
    provider: "anthropic_mcp",
    family: "commerce",
    serverUrlEnv: "ANTHROPIC_MCP_COMMERCE_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_COMMERCE_AUTH_TOKEN",
    description: "Operate commerce, inventory, order, supplier, and fulfillment systems.",
    appropriateFor: ["orders", "inventory", "supplier portals", "returns", "fulfillment updates"],
    outputType: "commerce_record",
    riskLevel: "high",
    approvalRequired: true,
  },
  {
    id: "finance_backoffice_ops",
    label: "Finance Back Office Operations",
    provider: "anthropic_mcp",
    family: "finance",
    serverUrlEnv: "ANTHROPIC_MCP_FINANCE_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_FINANCE_AUTH_TOKEN",
    description: "Operate accounting, invoicing, reconciliation, and finance systems with guarded approvals.",
    appropriateFor: ["invoices", "reconciliation", "collections prep", "expense review", "accounting updates"],
    outputType: "financial_record",
    riskLevel: "high",
    approvalRequired: true,
  },
  {
    id: "market_personal_watchers",
    label: "Market and Personal Watchers",
    provider: "anthropic_mcp",
    family: "personal",
    serverUrlEnv: "ANTHROPIC_MCP_PERSONAL_WATCHER_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_PERSONAL_WATCHER_AUTH_TOKEN",
    description: "Operate personal watch systems for markets, bills, travel, subscriptions, and recurring life admin.",
    appropriateFor: ["stock watchlists", "bill monitoring", "subscription checks", "travel alerts", "life admin"],
    outputType: "generic_artifact",
    riskLevel: "medium",
    approvalRequired: true,
  },
  {
    id: "travel_planning_ops",
    label: "Travel Planning Operations",
    provider: "anthropic_mcp",
    family: "travel",
    serverUrlEnv: "ANTHROPIC_MCP_TRAVEL_SERVER_URL",
    authTokenEnv: "ANTHROPIC_MCP_TRAVEL_AUTH_TOKEN",
    description: "Operate travel planning, itinerary, price-watch, booking-prep, and logistics tools.",
    appropriateFor: ["itineraries", "flight watch", "hotel comparisons", "visa reminders", "trip logistics"],
    outputType: "travel_plan",
    riskLevel: "medium",
    approvalRequired: true,
  },
];

function parseCustomClaudeMcpTools() {
  const raw = process.env.DOBLY_CUSTOM_MCP_TOOLS_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): ClaudeMcpToolDefinition | null => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const id = String(record.id ?? "").trim();
        const label = String(record.label ?? "").trim();
        const serverUrlEnv = String(record.serverUrlEnv ?? "").trim();
        if (!id || !label || !serverUrlEnv) return null;

        return {
          id,
          label,
          provider: "anthropic_mcp",
          family: String(record.family ?? "custom") as ClaudeMcpCapabilityFamily,
          serverUrlEnv,
          authTokenEnv: record.authTokenEnv ? String(record.authTokenEnv) : undefined,
          description: String(record.description ?? `${label} software execution tool.`),
          appropriateFor: Array.isArray(record.appropriateFor)
            ? record.appropriateFor.map((value) => String(value))
            : ["custom software execution"],
          outputType: String(record.outputType ?? "generic_artifact") as ClaudeMcpToolDefinition["outputType"],
          riskLevel: String(record.riskLevel ?? "high") as ClaudeMcpRiskLevel,
          approvalRequired: record.approvalRequired !== false,
          recommendedModel: record.recommendedModel ? String(record.recommendedModel) : undefined,
        };
      })
      .filter((tool): tool is ClaudeMcpToolDefinition => Boolean(tool));
  } catch {
    return [];
  }
}

export const CLAUDE_MCP_TOOLS = BUILT_IN_CLAUDE_MCP_TOOLS;

export function listClaudeMcpTools() {
  const tools = new Map<string, ClaudeMcpToolDefinition>();
  for (const tool of [...BUILT_IN_CLAUDE_MCP_TOOLS, ...parseCustomClaudeMcpTools()]) {
    tools.set(tool.id, tool);
  }
  return Array.from(tools.values());
}

export function getClaudeMcpTool(toolId: string | null | undefined) {
  if (!toolId) return null;
  return listClaudeMcpTools().find((tool) => tool.id === toolId) ?? null;
}

export function resolveClaudeMcpServerConfig(tool: ClaudeMcpToolDefinition) {
  const directUrl = process.env[tool.serverUrlEnv];
  const gatewayUrl = process.env.DOBLY_TOOL_GATEWAY_URL;
  const directToken = tool.authTokenEnv ? process.env[tool.authTokenEnv] : undefined;
  const gatewayToken = process.env.DOBLY_TOOL_GATEWAY_TOKEN;

  return {
    serverUrl: directUrl || gatewayUrl || "",
    authToken: directToken || gatewayToken || "",
    source: directUrl ? "direct" : gatewayUrl ? "gateway" : "missing",
  } as const;
}

export function listConfiguredClaudeMcpTools() {
  return listClaudeMcpTools().filter((tool) => Boolean(resolveClaudeMcpServerConfig(tool).serverUrl));
}
