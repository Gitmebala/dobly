import { createGenerationMessage, hasUsableGenerationProvider, isFreeTierOnly, resolveGenerationModelLabel, resolveGenerationProviderLabel } from "@/lib/anthropic";
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

  if (!hasUsableGenerationProvider()) {
    return {
      status: "needs_connection",
      summary: isFreeTierOnly()
        ? `${mcpToolName} tool-operation is prepared, but DOBLY_FREE_TIER_ONLY is set and no free provider (NVIDIA_API_KEY or GROQ_API_KEY) is configured yet.`
        : `${mcpToolName} tool-operation is prepared, but no AI provider (ANTHROPIC_API_KEY, GROQ_API_KEY, or NVIDIA_API_KEY) is configured yet.`,
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

  // DOBLY_TOOL_MODEL only means something on the Anthropic branch - a
  // free-tier NVIDIA/Groq call must keep its own correct default model id.
  const anthropicModelOverride = process.env.DOBLY_TOOL_MODEL || process.env.DOBLY_PREMIUM_MODEL || "claude-sonnet-5";
  const model = resolveGenerationModelLabel();
  const estimate = estimateCapabilityCost({ capability: "ai.reasoning", preferredProvider: "anthropic" });
  let reservation: { id: string } | null = null;

  try {
    reservation = await reserveOperatingCapacity({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      capability: "ai.reasoning",
      provider: resolveGenerationProviderLabel(),
      estimatedMinor: estimate.estimatedMinor,
      idempotencyKey: `agent-tool:${input.taskId}:${input.toolName}`,
      jobId: input.taskId,
      metadata: { toolName: mcpToolName, model },
    });
    const message = await createGenerationMessage({
      ...(isFreeTierOnly() ? {} : { model: anthropicModelOverride }),
      maxTokens: 1600,
      system: [
        "You are a specialist worker inside Dobly's guarded agent runtime.",
        "Complete only the specific assigned step.",
        "If real external operation is not available, return a prepared execution plan and do not pretend it was completed.",
        "Keep money, legal, customer-trust, and irreversible actions approval-gated.",
      ].join("\n"),
      userContent: [
        `Tool: ${mcpToolName}`,
        `Task: ${input.task}`,
        `Context: ${JSON.stringify(input.context ?? {}, null, 2)}`,
        input.mcpServerUrl ? `Remote MCP server: ${input.mcpServerUrl}` : "No remote MCP server supplied.",
      ].join("\n\n"),
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
