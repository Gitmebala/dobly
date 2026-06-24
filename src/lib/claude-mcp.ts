import { getClaudeMcpTool, resolveClaudeMcpServerConfig } from "@/lib/mcp-registry";

type JsonRecord = Record<string, unknown>;

export interface ClaudeMcpExecutionInput {
  task: string;
  context: JsonRecord;
  toolId: string;
  outputSchema?: JsonRecord | null;
  allowedTools?: string[] | null;
  model?: string | null;
  maxTokens?: number | null;
  timeoutMs?: number | null;
}

export interface ClaudeMcpExecutionResult {
  summary: string;
  model: string;
  toolId: string;
  serverUrl: string;
  text: string;
  rawContent: unknown[];
  usage?: JsonRecord | null;
}

export interface DynamicClaudeMcpExecutionInput {
  task: string;
  context: JsonRecord;
  serverName: string;
  serverUrl: string;
  authToken?: string | null;
  allowedTools?: string[] | null;
  model?: string | null;
  maxTokens?: number | null;
  timeoutMs?: number | null;
  outputSchema?: JsonRecord | null;
}

function getAnthropicModel(preferred?: string | null, fallback?: string | null) {
  return preferred || fallback || process.env.ANTHROPIC_CLAUDE_MCP_MODEL || "claude-sonnet-4-20250514";
}

function getAnthropicVersion() {
  return process.env.ANTHROPIC_API_VERSION || "2023-06-01";
}

function getAnthropicMcpBeta() {
  return process.env.ANTHROPIC_MCP_BETA || "mcp-client-2025-11-20";
}

function normalizeTextBlocks(content: unknown[]) {
  return content
    .filter((block) => block && typeof block === "object" && (block as Record<string, unknown>).type === "text")
    .map((block) => String((block as Record<string, unknown>).text ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function summarizeClaudeMcpText(text: string, toolLabel: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return `Claude used ${toolLabel} and returned an empty text summary.`;
  }
  return trimmed.slice(0, 280);
}

export async function executeClaudeMcpStep(input: ClaudeMcpExecutionInput): Promise<ClaudeMcpExecutionResult> {
  const tool = getClaudeMcpTool(input.toolId);
  if (!tool) {
    throw new Error(`Unknown Claude MCP tool: ${input.toolId}`);
  }

  const serverConfig = resolveClaudeMcpServerConfig(tool);
  const serverUrl = serverConfig.serverUrl;
  if (!serverUrl) {
    throw new Error(
      `${tool.label} is not available yet because Dobly's tool gateway is not configured.`,
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const model = getAnthropicModel(input.model, tool.recommendedModel);
  const requestBody = {
    model,
    max_tokens: Math.max(512, Math.min(8_000, Number(input.maxTokens ?? 2_000))),
    system: [
      "You are a specialist Claude worker running as one bounded step inside Dobly's workflow runtime.",
      `Use the configured MCP server for ${tool.label} when the task requires acting inside the target software.`,
      "Stay inside the provided task. Do not redesign the whole workflow or request extra setup from the user.",
      "Return a concise plain-language summary of what you completed, what artifacts you created or changed, and any blockers.",
      input.outputSchema ? `Preferred output schema: ${JSON.stringify(input.outputSchema)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                task: input.task,
                context: input.context,
              },
              null,
              2,
            ),
          },
        ],
      },
    ],
    mcp_servers: [
      {
        type: "url",
        url: serverUrl,
        name: tool.id,
        ...(serverConfig.authToken
          ? { authorization_token: serverConfig.authToken }
          : {}),
      },
    ],
    tools: [
      input.allowedTools && input.allowedTools.length > 0
        ? {
            type: "mcp_toolset",
            mcp_server_name: tool.id,
            default_config: { enabled: false },
            configs: Object.fromEntries(
              input.allowedTools.map((allowedTool) => [allowedTool, { enabled: true }]),
            ),
          }
        : {
            type: "mcp_toolset",
            mcp_server_name: tool.id,
            default_config: { enabled: true },
          },
    ],
  };

  const controller = new AbortController();
  const timeoutMs = Math.max(5_000, Math.min(300_000, Number(input.timeoutMs ?? 90_000)));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": getAnthropicVersion(),
        "anthropic-beta": getAnthropicMcpBeta(),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as
      | {
          content?: unknown[];
          usage?: JsonRecord;
          error?: { message?: string };
        }
      | null;

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          `Anthropic Claude MCP request failed with status ${response.status}.`,
      );
    }

    const rawContent = Array.isArray(data?.content) ? data!.content! : [];
    const text = normalizeTextBlocks(rawContent);

    return {
      summary: summarizeClaudeMcpText(text, tool.label),
      model,
      toolId: tool.id,
      serverUrl,
      text,
      rawContent,
      usage: data?.usage ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeDynamicClaudeMcpStep(
  input: DynamicClaudeMcpExecutionInput,
): Promise<ClaudeMcpExecutionResult> {
  if (!input.serverUrl) {
    throw new Error("Dynamic MCP execution requires a server URL.");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const model = getAnthropicModel(input.model, null);
  const requestBody = {
    model,
    max_tokens: Math.max(512, Math.min(8_000, Number(input.maxTokens ?? 2_000))),
    system: [
      "You are a specialist MCP worker running inside Dobly's universal tool execution runtime.",
      "Use the connected MCP server only for the bounded task provided.",
      "Do not ask the user for API details or MCP setup. Dobly has already routed the tool path.",
      "Return a concise summary of what you completed, artifacts created, and blockers.",
      input.outputSchema ? `Preferred output schema: ${JSON.stringify(input.outputSchema)}` : "",
    ].filter(Boolean).join("\n"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify({ task: input.task, context: input.context }, null, 2),
          },
        ],
      },
    ],
    mcp_servers: [
      {
        type: "url",
        url: input.serverUrl,
        name: input.serverName,
        ...(input.authToken ? { authorization_token: input.authToken } : {}),
      },
    ],
    tools: [
      input.allowedTools && input.allowedTools.length > 0
        ? {
            type: "mcp_toolset",
            mcp_server_name: input.serverName,
            default_config: { enabled: false },
            configs: Object.fromEntries(input.allowedTools.map((tool) => [tool, { enabled: true }])),
          }
        : {
            type: "mcp_toolset",
            mcp_server_name: input.serverName,
            default_config: { enabled: true },
          },
    ],
  };

  const controller = new AbortController();
  const timeoutMs = Math.max(5_000, Math.min(300_000, Number(input.timeoutMs ?? 90_000)));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": getAnthropicVersion(),
        "anthropic-beta": getAnthropicMcpBeta(),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as
      | { content?: unknown[]; usage?: JsonRecord; error?: { message?: string } }
      | null;
    if (!response.ok) {
      throw new Error(data?.error?.message || `Dynamic Claude MCP request failed with status ${response.status}.`);
    }

    const rawContent = Array.isArray(data?.content) ? data.content : [];
    const text = normalizeTextBlocks(rawContent);
    return {
      summary: summarizeClaudeMcpText(text, input.serverName),
      model,
      toolId: input.serverName,
      serverUrl: input.serverUrl,
      text,
      rawContent,
      usage: data?.usage ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
