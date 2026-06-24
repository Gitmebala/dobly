import "server-only";
import { normalizeMemoryTags } from "@/lib/business-memory";
import { appendOperatorChatMessage, ensureOperatorConversation, recordOperatorChatEvent } from "@/lib/operator-chat";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { OFFICE_WORKER_TEMPLATES } from "@/lib/office/departments";
import { inferBoardDirectiveMemory } from "@/lib/office/coordination-logic";
import type { HomebaseDashboardData } from "@/lib/office/homebase";
import { queueOfficeTask } from "@/lib/office/runtime";
import type { OfficeDepartmentId, OfficeWorkerKind } from "@/lib/office/types";
import type { DoblyLeadershipSummary } from "@/lib/dobly-os";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type WorkerAssignee = {
  departmentId: OfficeDepartmentId;
  workerKey: string;
  workerId: string | null;
  workerName: string;
  runtimeKind: OfficeWorkerKind | "system";
};

const DEPARTMENT_KEYWORDS: Record<OfficeDepartmentId, string[]> = {
  reception: ["reception", "chatbot", "website", "inbox", "message", "visitor", "front desk"],
  marketing: ["marketing", "content", "campaign", "social", "creative", "animation", "ad"],
  creative: ["creative", "design", "deck", "slide", "video", "asset", "brand", "canva", "figma"],
  sales: ["sales", "lead", "pipeline", "proposal", "follow-up", "follow up"],
  finance: ["finance", "invoice", "payment", "cash", "collections", "reconciliation"],
  support: ["support", "customer", "ticket", "complaint", "recovery"],
  engineering: ["engineering", "product", "github", "bug", "release", "qa", "issue", "code"],
  operations: ["operations", "supplier", "fulfillment", "delivery", "inventory", "coordination"],
  admin: ["admin", "calendar", "reminder", "booking", "assistant"],
  projects: ["project", "deliverable", "handoff", "dependency"],
  hr: ["hr", "people", "onboarding", "leave"],
  growth: ["growth", "experiment", "partnership", "opportunity"],
  analytics: ["analytics", "briefing", "anomaly", "signal", "research"],
  compliance: ["compliance", "policy", "risk", "audit", "consent"],
  integrations: ["integration", "webhook", "api", "connection"],
  training_room: ["training", "knowledge", "memory"],
  filing_cabinet: ["filing", "records", "memory"],
  general_manager: ["general manager", "gm", "coordination", "cross-department"],
  boardroom: ["board", "strategy", "executive", "decision"],
};

function departmentIdFromName(office: HomebaseDashboardData, name: string): OfficeDepartmentId | null {
  const match = office.departments.find((department) => department.name.toLowerCase() === name.toLowerCase());
  return (match?.id ?? null) as OfficeDepartmentId | null;
}

function selectAssignee(office: HomebaseDashboardData, issue: DoblyLeadershipSummary["generalManager"]["coordinationIssues"][number]): WorkerAssignee | null {
  const departmentIds = issue.departmentIds.filter(Boolean) as OfficeDepartmentId[];
  for (const departmentId of departmentIds) {
    const liveWorker = office.workers.find((worker) => worker.departmentId === departmentId && ["active", "shadow"].includes(worker.status));
    if (liveWorker) {
      return {
        departmentId,
        workerKey: liveWorker.workerKey,
        workerId: liveWorker.id,
        workerName: liveWorker.name,
        runtimeKind: liveWorker.runtimeKind,
      };
    }

    const template = OFFICE_WORKER_TEMPLATES.find((worker) => worker.departmentId === departmentId);
    if (template) {
      return {
        departmentId,
        workerKey: template.key,
        workerId: null,
        workerName: template.name,
        runtimeKind: template.kind,
      };
    }
  }

  const gmTemplate = OFFICE_WORKER_TEMPLATES.find((worker) => worker.departmentId === "general_manager");
  if (!gmTemplate) return null;
  return {
    departmentId: "general_manager",
    workerKey: gmTemplate.key,
    workerId: null,
    workerName: gmTemplate.name,
    runtimeKind: gmTemplate.kind,
  };
}

function operatorMatchesDepartment(operator: OperatorWithLoops, departmentId: OfficeDepartmentId) {
  const haystack = [
    operator.name,
    operator.kind,
    operator.mission,
    operator.outcome,
    ...(operator.capability_tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return (DEPARTMENT_KEYWORDS[departmentId] ?? []).some((keyword) => haystack.includes(keyword));
}

async function findOperatorAssignee(params: {
  userId: string;
  workspaceId?: string | null;
  departmentId: OfficeDepartmentId;
}) {
  const operators = await listDoblyOperators({ userId: params.userId, workspaceId: params.workspaceId ?? null }).catch((): OperatorWithLoops[] => []);
  const activeFirst = operators.filter((operator) => operator.status === "active");
  return (
    activeFirst.find((operator) => operatorMatchesDepartment(operator, params.departmentId)) ??
    operators.find((operator) => operatorMatchesDepartment(operator, params.departmentId)) ??
    null
  );
}

async function notifyOperatorAssignee(params: {
  userId: string;
  workspaceId?: string | null;
  operator: OperatorWithLoops;
  issue: DoblyLeadershipSummary["generalManager"]["coordinationIssues"][number];
  taskId: string;
  assignee: WorkerAssignee;
}) {
  const conversation = await ensureOperatorConversation({
    userId: params.userId,
    operatorId: params.operator.id,
    workspaceId: params.workspaceId ?? params.operator.workspace_id,
    title: `${params.operator.name} Chat`,
  });

  const from = params.issue.owner === "board" ? "Board" : "General Manager";
  const body = `${from} routed new coordination work here. Focus: ${params.issue.title}. Recommended action: ${params.issue.recommendedAction}`;
  const handoff = {
    fromDepartment: params.issue.owner === "board" ? "boardroom" : "general_manager",
    toDepartment: params.assignee.departmentId,
    assignedWorkerName: params.assignee.workerName,
  };

  await appendOperatorChatMessage({
    conversationId: conversation.id,
    userId: params.userId,
    workspaceId: params.workspaceId ?? params.operator.workspace_id,
    operatorId: params.operator.id,
    role: "system",
    intent: "system",
    body,
    metadata: {
      source: "leadership_runtime",
      coordinationId: params.issue.id,
      officeTaskId: params.taskId,
      handoff,
    },
  }).catch(() => undefined);

  await recordOperatorChatEvent({
    conversationId: conversation.id,
    userId: params.userId,
    workspaceId: params.workspaceId ?? params.operator.workspace_id,
    operatorId: params.operator.id,
    eventType: "handoff_received",
    title: `${from} handoff received`,
    summary: `${params.issue.title} is now assigned here through the office coordination layer.`,
    severity: params.issue.riskLevel === "high" || params.issue.riskLevel === "critical" ? "warning" : "info",
    payload: {
      coordinationId: params.issue.id,
      officeTaskId: params.taskId,
      departments: params.issue.departments,
      recommendedAction: params.issue.recommendedAction,
      handoff,
    },
  }).catch(() => undefined);
}

async function persistBoardDirectiveMemory(params: {
  userId: string;
  workspaceId?: string | null;
  issue: DoblyLeadershipSummary["generalManager"]["coordinationIssues"][number];
}) {
  const admin = createAdminSupabaseClient();
  const memory = inferBoardDirectiveMemory({
    title: params.issue.title,
    summary: params.issue.summary,
    recommendedAction: params.issue.recommendedAction,
    departmentIds: params.issue.departmentIds,
  });

  const metadata = {
    source: "office.boardroom",
    boardDirective: true,
    coordinationIssueId: params.issue.id,
    pressureScore: params.issue.pressureScore,
    riskLevel: params.issue.riskLevel,
    departments: params.issue.departmentIds,
    recommendedAction: params.issue.recommendedAction,
  };

  const { data: existing } = await admin
    .from("business_memory_items")
    .select("id, metadata")
    .eq("user_id", params.userId)
    .eq("title", memory.title)
    .limit(1)
    .maybeSingle()
    .catch(() => ({ data: null }));

  if (existing?.id) {
    await admin
      .from("business_memory_items")
      .update({
        workspace_id: params.workspaceId ?? null,
        kind: memory.kind,
        scope: memory.scope,
        body: memory.body,
        tags: normalizeMemoryTags(memory.tags),
        source: "office.boardroom",
        confidence: params.issue.riskLevel === "critical" ? 0.94 : 0.88,
        metadata: {
          ...(((existing as any).metadata ?? {}) as Record<string, unknown>),
          ...metadata,
        },
        department_id: memory.departmentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", params.userId)
      .catch(() => undefined);

    return String(existing.id);
  }

  const { data } = await admin
    .from("business_memory_items")
    .insert({
      user_id: params.userId,
      workspace_id: params.workspaceId ?? null,
      kind: memory.kind,
      scope: memory.scope,
      title: memory.title,
      body: memory.body,
      tags: normalizeMemoryTags(memory.tags),
      source: "office.boardroom",
      confidence: params.issue.riskLevel === "critical" ? 0.94 : 0.88,
      metadata,
      department_id: memory.departmentId,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()
    .catch(() => ({ data: null }));

  return data?.id ? String(data.id) : null;
}

export async function ensureLeadershipCoordination(params: {
  userId: string;
  workspaceId?: string | null;
  office: HomebaseDashboardData;
  leadership: DoblyLeadershipSummary;
}) {
  const admin = createAdminSupabaseClient();
  let created = 0;
  let operatorNotices = 0;

  for (const issue of params.leadership.generalManager.coordinationIssues) {
    const assignee = selectAssignee(params.office, issue);
    if (!assignee) continue;
    const boardDirectiveMemoryId =
      issue.owner === "board"
        ? await persistBoardDirectiveMemory({
            userId: params.userId,
            workspaceId: params.workspaceId ?? null,
            issue,
          })
        : null;

    const coordinationId = `${issue.owner}:${issue.id}:${assignee.workerKey}`;
    const { data: existing } = await admin
      .from("office_tasks")
      .select("id")
      .eq("user_id", params.userId)
      .contains("tool_payload", { coordinationId })
      .in("status", ["queued", "running", "waiting_approval"])
      .limit(1)
      .maybeSingle()
      .catch(() => ({ data: null }));

    if (existing?.id) continue;

    const titlePrefix = issue.owner === "board" ? "Board directive" : "GM coordination";
    const task = await queueOfficeTask({
      workspaceId: params.workspaceId ?? null,
      userId: params.userId,
      departmentId: assignee.departmentId,
      workerKey: assignee.workerKey,
      workerId: assignee.workerId,
      runtimeKind: assignee.runtimeKind,
      title: `${titlePrefix}: ${issue.title}`,
      summary: `${issue.summary} Assigned to ${assignee.workerName}. ${issue.recommendedAction}`,
      riskLevel: issue.riskLevel,
      requiresApproval: issue.riskLevel === "high" || issue.riskLevel === "critical" || issue.owner === "board",
      toolName: null,
      toolPayload: {
        coordinationId,
        coordination: {
          id: issue.id,
          pressureScore: issue.pressureScore,
          departments: issue.departments,
          departmentIds: issue.departmentIds,
          route: issue.departmentIds,
          currentIndex: Math.max(0, issue.departmentIds.findIndex((departmentId) => departmentId === assignee.departmentId)),
          recommendedAction: issue.recommendedAction,
          owner: issue.owner,
        },
        handoff: {
          fromDepartment: issue.owner === "board" ? "boardroom" : "general_manager",
          toDepartment: assignee.departmentId,
          assignedWorkerId: assignee.workerId,
          assignedWorkerName: assignee.workerName,
          route: issue.departmentIds,
          stageIndex: Math.max(0, issue.departmentIds.findIndex((departmentId) => departmentId === assignee.departmentId)),
        },
        boardDirective: issue.owner === "board",
        boardDirectiveMemoryId,
      },
      source: issue.owner === "board" ? "office.boardroom" : "office.general_manager",
      entityType: "office_task",
      eventTitle: issue.owner === "board" ? `Board assigned ${assignee.workerName}` : `General Manager handed work to ${assignee.workerName}`,
      eventSummary: `${issue.title} is now owned by ${assignee.workerName} in ${assignee.departmentId.replaceAll("_", " ")}.`,
    });

    created += 1;

    const operator = await findOperatorAssignee({
      userId: params.userId,
      workspaceId: params.workspaceId ?? null,
      departmentId: assignee.departmentId,
    });

    if (operator) {
      await notifyOperatorAssignee({
        userId: params.userId,
        workspaceId: params.workspaceId ?? null,
        operator,
        issue,
        taskId: String((task as any).id),
        assignee,
      });
      operatorNotices += 1;
    }
  }

  return { created, operatorNotices };
}
