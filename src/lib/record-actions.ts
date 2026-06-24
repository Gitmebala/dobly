import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { recordOfficeEvent } from "@/lib/office/events";
import type { DepartmentRecordKind } from "@/lib/department-records";
import type { OfficeDepartmentId, OfficeRiskLevel, OfficeTaskStatus, OfficeWorkerKind } from "@/lib/office/types";

interface LoadedRecord {
  row: Record<string, any>;
  workspaceId: string | null;
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

interface RecordActionSpec {
  departmentId: OfficeDepartmentId;
  workerKey: string;
  runtimeKind: OfficeWorkerKind | "system";
  title: string;
  summary: string;
  riskLevel: OfficeRiskLevel;
  status: OfficeTaskStatus;
  approvalRequired: boolean;
  toolName: string | null;
  toolPayload: Record<string, unknown>;
  recordStatusUpdate?: {
    table: string;
    values: Record<string, unknown>;
  };
}

const RECORD_TABLES: Record<DepartmentRecordKind, string> = {
  conversation: "communication_conversations",
  lead: "leads",
  support_case: "support_cases",
  finance_record: "finance_records",
  invoice: "invoices",
  operations_item: "operations_items",
  content_item: "content_items",
  engineering_item: "action_candidates",
  customer: "customers",
};

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function firstContactChannel(contact: LoadedRecord["contact"]) {
  if (contact.email) {
    return { channel: "email" as const, to: contact.email };
  }
  if (contact.phone) {
    return { channel: "sms" as const, to: contact.phone };
  }
  return null;
}

async function verifyWorkspaceOwner(params: {
  workspaceId: string | null;
  userId: string;
}) {
  if (!params.workspaceId) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("workspaces")
    .select("id")
    .eq("id", params.workspaceId)
    .eq("owner_user_id", params.userId)
    .maybeSingle();
  return Boolean(data);
}

async function loadCustomer(customerId: string | null | undefined) {
  if (!customerId) return { name: null, email: null, phone: null };
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("customers")
    .select("full_name,email,phone")
    .eq("id", customerId)
    .maybeSingle();
  return {
    name: asText((data as any)?.full_name, null as any),
    email: asText((data as any)?.email, null as any),
    phone: asText((data as any)?.phone, null as any),
  };
}

async function loadRecord(params: {
  userId: string;
  kind: DepartmentRecordKind;
  recordId: string;
}): Promise<LoadedRecord> {
  const table = RECORD_TABLES[params.kind];
  if (!table) throw new Error("Unsupported record kind.");

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("id", params.recordId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Could not load ${params.kind.replaceAll("_", " ")}.`);
  }

  const row = data as Record<string, any>;
  if (params.kind === "conversation" || params.kind === "content_item") {
    if (String(row.user_id ?? "") !== params.userId) throw new Error("You do not own this record.");
  } else {
    const ownsWorkspace = await verifyWorkspaceOwner({
      workspaceId: row.workspace_id ?? null,
      userId: params.userId,
    });
    if (!ownsWorkspace) throw new Error("You do not own this record.");
  }

  const contact =
    params.kind === "conversation"
      ? {
          name: row.contact_name ?? null,
          email: /@/.test(String(row.contact_identifier ?? "")) ? String(row.contact_identifier) : null,
          phone: /@/.test(String(row.contact_identifier ?? "")) ? null : String(row.contact_identifier ?? "") || null,
        }
      : await loadCustomer(row.customer_id);

  return {
    row,
    workspaceId: row.workspace_id ?? null,
    contact,
  };
}

function communicationPayload(params: {
  loaded: LoadedRecord;
  body: string;
}) {
  const channel = firstContactChannel(params.loaded.contact);
  if (!channel) return { toolName: null, payload: {} };
  return {
    toolName: "communication_reply",
    payload: {
      channel: channel.channel,
      to: channel.to,
      body: params.body,
      conversationId: params.loaded.row.conversation_id ?? params.loaded.row.id ?? null,
      recordId: params.loaded.row.id,
    },
  };
}

function buildActionSpec(kind: DepartmentRecordKind, loaded: LoadedRecord): RecordActionSpec {
  const row = loaded.row;
  const contactName = loaded.contact.name || loaded.contact.email || loaded.contact.phone || "the customer";

  if (kind === "lead") {
    const body = `Hi ${contactName}, thanks for reaching out. I wanted to follow up and understand the timing, budget, and exact outcome you want so we can recommend the right next step.`;
    const comms = communicationPayload({ loaded, body });
    return {
      departmentId: "sales",
      workerKey: "sales_followup_worker",
      runtimeKind: "automation",
      title: `Follow up with lead: ${contactName}`,
      summary: "Prepare and send a qualification follow-up for this lead.",
      riskLevel: row.value_estimate ? "medium" : "low",
      status: row.value_estimate || !comms.toolName ? "waiting_approval" : "queued",
      approvalRequired: Boolean(row.value_estimate || !comms.toolName),
      toolName: comms.toolName,
      toolPayload: { ...comms.payload, recordKind: kind, leadId: row.id },
      recordStatusUpdate: {
        table: "leads",
        values: { status: "contacted", updated_at: new Date().toISOString() },
      },
    };
  }

  if (kind === "support_case") {
    const body = `Hi ${contactName}, thanks for the details. I am checking this carefully and will make sure we resolve it properly. Could you share any order, booking, or account reference that helps us verify the issue?`;
    const comms = communicationPayload({ loaded, body });
    return {
      departmentId: "support",
      workerKey: "customer_recovery_agent",
      runtimeKind: "agent",
      title: `Prepare support recovery: ${asText(row.title, contactName)}`,
      summary: asText(row.next_action, "Draft a careful recovery response and keep sensitive language under approval."),
      riskLevel: row.priority === "high" || row.priority === "critical" ? "high" : "medium",
      status: "waiting_approval",
      approvalRequired: true,
      toolName: comms.toolName,
      toolPayload: { ...comms.payload, recordKind: kind, supportCaseId: row.id },
      recordStatusUpdate: {
        table: "support_cases",
        values: { status: "waiting_internal", updated_at: new Date().toISOString() },
      },
    };
  }

  if (kind === "finance_record" || kind === "invoice") {
    const amount = row.amount ? `${row.currency ?? "KES"} ${Number(row.amount).toLocaleString()}` : "the open balance";
    const body = `Hi ${contactName}, quick follow-up on ${amount}. Could you confirm the payment status or share a reference if already paid?`;
    const comms = communicationPayload({ loaded, body });
    return {
      departmentId: "finance",
      workerKey: kind === "invoice" ? "invoice_chaser_automation" : "receipt_matching_worker",
      runtimeKind: "automation",
      title: kind === "invoice" ? `Chase invoice: ${amount}` : `Review finance record: ${amount}`,
      summary: "Create a finance-safe follow-up or matching task with owner visibility.",
      riskLevel: "medium",
      status: "waiting_approval",
      approvalRequired: true,
      toolName: comms.toolName,
      toolPayload: { ...comms.payload, recordKind: kind, recordId: row.id, amount },
      recordStatusUpdate: {
        table: kind === "invoice" ? "invoices" : "finance_records",
        values:
          kind === "invoice"
            ? { updated_at: new Date().toISOString() }
            : { status: "queued_followup", updated_at: new Date().toISOString() },
      },
    };
  }

  if (kind === "operations_item") {
    return {
      departmentId: "operations",
      workerKey: "task_coordination_worker",
      runtimeKind: "automation",
      title: `Coordinate operation: ${asText(row.title, "Operations item")}`,
      summary: "Create the internal next move, identify owner/dependency/deadline, and surface blockers.",
      riskLevel: row.priority === "high" || row.priority === "critical" ? "medium" : "low",
      status: "queued",
      approvalRequired: false,
      toolName: null,
      toolPayload: { recordKind: kind, operationsItemId: row.id, nextAction: row.next_action ?? null },
      recordStatusUpdate: {
        table: "operations_items",
        values: { status: "in_progress", updated_at: new Date().toISOString() },
      },
    };
  }

  if (kind === "conversation") {
    const body = `Thanks for your message. I am routing this to the right person and will follow up with the next step shortly.`;
    const comms = communicationPayload({ loaded, body });
    return {
      departmentId: "reception",
      workerKey: "front_desk_bot",
      runtimeKind: "bot",
      title: `Continue conversation: ${contactName}`,
      summary: "Prepare the next safe reception response and route the conversation if needed.",
      riskLevel: row.risk_level ?? "medium",
      status: row.risk_level === "low" && comms.toolName ? "queued" : "waiting_approval",
      approvalRequired: row.risk_level !== "low" || !comms.toolName,
      toolName: comms.toolName,
      toolPayload: { ...comms.payload, recordKind: kind, conversationId: row.id },
      recordStatusUpdate: {
        table: "communication_conversations",
        values: { status: "waiting_owner", updated_at: new Date().toISOString() },
      },
    };
  }

  if (kind === "content_item") {
    return {
      departmentId: "marketing",
      workerKey: "social_content_worker",
      runtimeKind: "agent",
      title: `Prepare content package: ${asText(row.title, "Content item")}`,
      summary: "Refine this content into channel-ready assets and queue it for approval.",
      riskLevel: "medium",
      status: "waiting_approval",
      approvalRequired: true,
      toolName: null,
      toolPayload: { recordKind: kind, contentItemId: row.id, channel: row.channel ?? null },
      recordStatusUpdate: {
        table: "content_items",
        values: { status: "needs_review", updated_at: new Date().toISOString() },
      },
    };
  }

  return {
    departmentId: "filing_cabinet",
    workerKey: "record_review_worker",
    runtimeKind: "automation",
    title: `Review record: ${contactName}`,
    summary: "Review this record and prepare the most useful next action.",
    riskLevel: "low",
    status: "queued",
    approvalRequired: false,
    toolName: null,
    toolPayload: { recordKind: kind, recordId: row.id },
  };
}

export async function createOfficeTaskFromRecord(params: {
  userId: string;
  kind: DepartmentRecordKind;
  recordId: string;
}) {
  const admin = createAdminSupabaseClient();
  const loaded = await loadRecord(params);
  const spec = buildActionSpec(params.kind, loaded);

  const { data: task, error } = await admin
    .from("office_tasks")
    .insert({
      workspace_id: loaded.workspaceId,
      user_id: params.userId,
      department_id: spec.departmentId,
      worker_key: spec.workerKey,
      runtime_kind: spec.runtimeKind,
      title: spec.title,
      summary: spec.summary,
      risk_level: spec.riskLevel,
      status: spec.status,
      approval_required: spec.approvalRequired,
      tool_name: spec.toolName,
      tool_payload: {
        ...spec.toolPayload,
        sourceRecord: {
          kind: params.kind,
          id: params.recordId,
        },
      },
    })
    .select("*")
    .single();

  if (error || !task) {
    throw new Error(`Failed to create record action task: ${error?.message ?? "unknown error"}`);
  }

  if (spec.recordStatusUpdate) {
    await admin
      .from(spec.recordStatusUpdate.table)
      .update(spec.recordStatusUpdate.values)
      .eq("id", params.recordId);
  }

  await recordOfficeEvent({
    workspaceId: loaded.workspaceId,
    userId: params.userId,
    departmentId: spec.departmentId,
    workerKind: spec.runtimeKind,
    eventType: "worker.action_proposed",
    source: "department.record_action",
    entityType: params.kind,
    entityId: params.recordId,
    title: spec.title,
    summary: spec.approvalRequired
      ? "Dobly turned this record into a proposed action waiting for approval."
      : "Dobly turned this record into queued work.",
    payload: {
      task,
      sourceRecord: {
        kind: params.kind,
        id: params.recordId,
      },
      spec,
    },
    riskLevel: spec.riskLevel,
  });

  return {
    task,
    spec,
  };
}
