import type { ConnectorExecutor } from "@/lib/connectors/sdk";
import { consultCoworker } from "@/lib/operator-groups";

// The real executor behind the "consult_coworker" capability
// (runtime/capabilities.ts) - a coworker's own task asking a colleague a
// direct question mid-execution and getting a real answer back, no user
// setup required. `fromOperatorId` is injected server-side by
// runtime/universal-mcp-execution.ts (not left for the LLM's own tool call
// to self-report, which would be unreliable) - see that file's comment at
// the injection site.
export const consultCoworkerExecutor: ConnectorExecutor = {
  id: "native.coworker.consult",
  async execute(context) {
    const fromOperatorId = String(context.config.fromOperatorId ?? "").trim();
    const targetOperatorName = String(context.config.targetOperatorName ?? context.config.coworkerName ?? "").trim();
    const question = String(context.config.question ?? context.step.description ?? "").trim();

    if (!fromOperatorId) throw new Error("Missing the asking coworker's own identity.");
    if (!targetOperatorName) throw new Error("Need to know which coworker to ask.");
    if (!question) throw new Error("Need an actual question to ask.");

    const result = await consultCoworker({
      userId: context.workflow.user_id,
      workspaceId: (context.config.workspaceId as string | undefined) ?? null,
      fromOperatorId,
      targetOperatorName,
      question,
    });

    return {
      askedOperator: result.targetOperatorName,
      reply: result.reply,
      groupId: result.groupId,
    };
  },
};
