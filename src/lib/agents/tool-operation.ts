import { anthropic } from "@/lib/anthropic";
import { estimateCapabilityCost } from "@/lib/billing/cost-catalog";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";
import type { OfficeToolExecutionResult } from "@/lib/office/tool-executor";

export interface AgentToolOperationInput {
  userId: string;
  workspaceId?: string | null;
  taskId: string;
  toolName: string;
  task: string;
  context?: Record<string, unknown>;
  mcpServerUrl?: string | null;
}

function textFromAnthropicContent(content: Array<{ type: string; text?: string }>) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

export async function executeAgentToolOperation(input: AgentToolOperationInput): Promise<OfficeToolExecutionResult> {
  const isMcpTool = input.toolName.startsWith("claude_mcp:") || Boolean(input.mcpServerUrl);
  const mcpToolName = input.toolName.replace(/^claude_mcp:/, "");

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      status: "needs_connection",
      summary: `${mcpToolName} tool-operation is prepared, but ANTHROPIC_API_KEY is not configured yet.`,
      output: {
        mode: "mock_tool_operation",
        toolName: mcpToolName,
        task: input.task,
        context: input.context ?? {},
      },
    };
  }

  if (isMcpTool && !input.mcpServerUrl) {
    return {
      status: "needs_connection",
      summary: `${mcpToolName} needs a remote MCP server URL before Dobly can operate that software.`,
      output: {
        mode: "mcp_server_missing",
        toolName: mcpToolName,
        task: input.task,
      },
    };
  }

  const model = process.env.DOBLY_TOOL_MODEL || process.env.DOBLY_PREMIUM_MODEL || "claude-sonnet-4-20250514";
  const estimate = estimateCapabilityCost({ capability: "ai.reasoning", preferredProvider: "anthropic" });
  let reservation: { id: string } | null = null;

  try {
    reservation = await reserveOperatingCapacity({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      capability: "ai.reasoning",
      provider: estimate.route.provider,
      estimatedMinor: estimate.estimatedMinor,
      idempotencyKey: `agent-tool:${input.taskId}:${input.toolName}`,
      jobId: input.taskId,
      metadata: { toolName: mcpToolName, model },
    });
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1600,
      system: [
        "You are a specialist worker inside Dobly's guarded agent runtime.",
        "Complete only the specific assigned step.",
        "If real external operation is not available, return a prepared execution plan and do not pretend it was completed.",
        "Keep money, legal, customer-trust, and irreversible actions approval-gated.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [
            `Tool: ${mcpToolName}`,
            `Task: ${input.task}`,
            `Context: ${JSON.stringify(input.context ?? {}, null, 2)}`,
            input.mcpServerUrl ? `Remote MCP server: ${input.mcpServerUrl}` : "No remote MCP server supplied.",
          ].join("\n\n"),
        },
      ],
    });

    const text = textFromAnthropicContent(message.content);
    await settleOperatingCapacity({
      reservationId: reservation!.id,
      actualMinor: estimate.estimatedMinor,
      status: "succeeded",
      providerRequestId: message.id,
      metadata: { model, usage: message.usage },
    });
    return {
      status: "completed",
      summary: text || `${mcpToolName} returned a tool-operation response.`,
      output: {
        mode: isMcpTool ? "claude_mcp_prepared" : "claude_tool_operation",
        toolName: mcpToolName,
        model,
        content: text,
        usage: message.usage,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `${mcpToolName} tool-operation failed.`;
    if (reservation?.id) {
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: failedProviderCharge({
          paidRail: estimate.route.paidRail,
          estimatedMinor: estimate.estimatedMinor,
          errorMessage,
        }),
        status: "failed",
        metadata: { error: errorMessage, model },
      }).catch(() => undefined);
    }
    return {
      status: "failed",
      summary: errorMessage,
      output: {
        mode: "tool_operation_failed",
        toolName: mcpToolName,
        error: errorMessage,
      },
    };
  }
}
