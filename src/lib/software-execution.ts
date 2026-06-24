import { executeClaudeMcpStep, type ClaudeMcpExecutionResult } from "@/lib/claude-mcp";
import { getClaudeMcpTool, listClaudeMcpTools, type ClaudeMcpToolDefinition } from "@/lib/mcp-registry";

type JsonRecord = Record<string, unknown>;

export type SoftwareExecutionStatus =
  | "completed"
  | "needs_approval"
  | "not_configured"
  | "failed";

export interface SoftwareExecutionToolStatus {
  id: string;
  label: string;
  family: ClaudeMcpToolDefinition["family"];
  description: string;
  outputType: ClaudeMcpToolDefinition["outputType"];
  riskLevel: ClaudeMcpToolDefinition["riskLevel"];
  approvalRequired: boolean;
  configured: boolean;
  serverUrlEnv: string;
  authTokenEnv: string | null;
  appropriateFor: string[];
}

export interface SoftwareExecutionRequest {
  userId: string;
  workspaceId?: string | null;
  toolId: string;
  task: string;
  context?: JsonRecord;
  outputSchema?: JsonRecord | null;
  approved?: boolean;
  allowedTools?: string[] | null;
}

export interface SoftwareExecutionResponse {
  status: SoftwareExecutionStatus;
  tool: SoftwareExecutionToolStatus | null;
  task: string;
  workspaceId: string | null;
  requiresApproval: boolean;
  summary: string;
  result?: ClaudeMcpExecutionResult;
  error?: string;
}

function isConfigured(tool: ClaudeMcpToolDefinition) {
  return Boolean(process.env[tool.serverUrlEnv]);
}

function toToolStatus(tool: ClaudeMcpToolDefinition): SoftwareExecutionToolStatus {
  return {
    id: tool.id,
    label: tool.label,
    family: tool.family,
    description: tool.description,
    outputType: tool.outputType,
    riskLevel: tool.riskLevel,
    approvalRequired: tool.approvalRequired,
    configured: isConfigured(tool),
    serverUrlEnv: tool.serverUrlEnv,
    authTokenEnv: tool.authTokenEnv ?? null,
    appropriateFor: tool.appropriateFor,
  };
}

export function listSoftwareExecutionTools() {
  return listClaudeMcpTools().map(toToolStatus);
}

export function getSoftwareExecutionToolStatus(toolId: string | null | undefined) {
  const tool = getClaudeMcpTool(toolId);
  return tool ? toToolStatus(tool) : null;
}

function approvalSummary(tool: SoftwareExecutionToolStatus) {
  return `${tool.label} is a ${tool.riskLevel}-risk software execution path. Dobly prepared the step and needs owner approval before acting inside the target software.`;
}

export async function runSoftwareExecution(input: SoftwareExecutionRequest): Promise<SoftwareExecutionResponse> {
  const tool = getClaudeMcpTool(input.toolId);
  if (!tool) {
    return {
      status: "failed",
      tool: null,
      task: input.task,
      workspaceId: input.workspaceId ?? null,
      requiresApproval: false,
      summary: `Unknown software execution tool: ${input.toolId}`,
      error: `Unknown software execution tool: ${input.toolId}`,
    };
  }

  const status = toToolStatus(tool);
  const requiresApproval = tool.approvalRequired && !input.approved;

  if (!status.configured) {
    return {
      status: "not_configured",
      tool: status,
      task: input.task,
      workspaceId: input.workspaceId ?? null,
      requiresApproval: tool.approvalRequired,
      summary: `${tool.label} is registered but not configured. Set ${tool.serverUrlEnv} before Dobly can execute this software task.`,
    };
  }

  if (requiresApproval) {
    return {
      status: "needs_approval",
      tool: status,
      task: input.task,
      workspaceId: input.workspaceId ?? null,
      requiresApproval: true,
      summary: approvalSummary(status),
    };
  }

  try {
    const result = await executeClaudeMcpStep({
      task: input.task,
      context: {
        ...(input.context ?? {}),
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        doblyRuntime: "software_execution",
      },
      toolId: input.toolId,
      outputSchema: input.outputSchema ?? null,
      allowedTools: input.allowedTools ?? null,
    });

    return {
      status: "completed",
      tool: status,
      task: input.task,
      workspaceId: input.workspaceId ?? null,
      requiresApproval: false,
      summary: result.summary,
      result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Software execution failed.";
    return {
      status: "failed",
      tool: status,
      task: input.task,
      workspaceId: input.workspaceId ?? null,
      requiresApproval: tool.approvalRequired,
      summary: message,
      error: message,
    };
  }
}
