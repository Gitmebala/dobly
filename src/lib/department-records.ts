import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { OfficeDepartmentId } from "@/lib/office/types";

export type DepartmentRecordKind =
  | "conversation"
  | "lead"
  | "support_case"
  | "finance_record"
  | "invoice"
  | "operations_item"
  | "content_item"
  | "engineering_item"
  | "customer";

export interface DepartmentOperatingRecord {
  id: string;
  kind: DepartmentRecordKind;
  title: string;
  summary: string;
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  ownerLabel: string | null;
  moneyLabel: string | null;
  nextAction: string | null;
  createdAt: string;
  href?: string;
}

export interface DepartmentOperatingData {
  workspaceIds: string[];
  records: DepartmentOperatingRecord[];
  metrics: Array<{
    label: string;
    value: string;
    hint: string;
  }>;
}

async function getWorkspaceIds(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", userId)
    .in("status", ["active", "paused"])
    .limit(20);

  if (error) return [];
  return (data ?? []).map((row: any) => String(row.id));
}

async function safeRows(callback: () => Promise<{ data: any[] | null; error: any }>) {
  try {
    const { data, error } = await callback();
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

function priority(value: unknown): DepartmentOperatingRecord["priority"] {
  const raw = String(value ?? "medium");
  if (raw === "critical" || raw === "high" || raw === "low") return raw;
  return "medium";
}

function money(amount: unknown, currency: unknown) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return `${String(currency ?? "KES")} ${value.toLocaleString()}`;
}

function newestFirst(records: DepartmentOperatingRecord[]) {
  return records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function metric(label: string, value: number | string, hint: string) {
  return { label, value: String(value), hint };
}

export async function loadDepartmentOperatingData(params: {
  userId: string;
  departmentId: OfficeDepartmentId;
}): Promise<DepartmentOperatingData> {
  const admin = createAdminSupabaseClient();
  const workspaceIds = await getWorkspaceIds(params.userId);
  if (workspaceIds.length === 0) {
    return {
      workspaceIds,
      records: [],
      metrics: [
        metric("Operating records", 0, "Create a workspace to activate department memory."),
        metric("Needs action", 0, "No workspace records yet."),
        metric("High priority", 0, "No high priority records yet."),
      ],
    };
  }

  let records: DepartmentOperatingRecord[] = [];

  if (params.departmentId === "sales") {
    const rows = await safeRows(() =>
      admin
        .from("leads")
        .select("*, customers(full_name, phone, email)")
        .in("workspace_id", workspaceIds)
        .order("updated_at", { ascending: false })
        .limit(24),
    );
    records = rows.map((row: any) => ({
      id: String(row.id),
      kind: "lead",
      title: String(row.customers?.full_name ?? row.source ?? "New lead"),
      summary: String(row.owner_notes ?? "Lead captured by Dobly."),
      status: String(row.status ?? "new"),
      priority: row.status === "qualified" || row.value_estimate ? "high" : "medium",
      ownerLabel: row.customers?.email ?? row.customers?.phone ?? null,
      moneyLabel: money(row.value_estimate, "KES"),
      nextAction: row.status === "new" ? "Qualify fit, urgency, budget, and next step." : "Keep the follow-up cadence moving.",
      createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }));
  } else if (params.departmentId === "support") {
    const rows = await safeRows(() =>
      admin
        .from("support_cases")
        .select("*, customers(full_name, phone, email)")
        .in("workspace_id", workspaceIds)
        .order("created_at", { ascending: false })
        .limit(24),
    );
    records = rows.map((row: any) => ({
      id: String(row.id),
      kind: "support_case",
      title: String(row.title ?? "Support case"),
      summary: String(row.summary ?? "Support case captured by Dobly."),
      status: String(row.status ?? "open"),
      priority: priority(row.priority),
      ownerLabel: row.customers?.full_name ?? row.customers?.email ?? row.customers?.phone ?? null,
      moneyLabel: null,
      nextAction: row.next_action ? String(row.next_action) : "Resolve or escalate with context.",
      createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }));
  } else if (params.departmentId === "finance") {
    const [financeRows, invoiceRows] = await Promise.all([
      safeRows(() =>
        admin
          .from("finance_records")
          .select("*, customers(full_name, phone, email)")
          .in("workspace_id", workspaceIds)
          .order("created_at", { ascending: false })
          .limit(18),
      ),
      safeRows(() =>
        admin
          .from("invoices")
          .select("*, customers(full_name, phone, email)")
          .in("workspace_id", workspaceIds)
          .order("updated_at", { ascending: false })
          .limit(12),
      ),
    ]);
    records = [
      ...financeRows.map((row: any) => ({
        id: String(row.id),
        kind: "finance_record" as const,
        title: String(row.record_type ?? "Finance record").replaceAll("_", " "),
        summary: String(row.summary ?? "Finance item captured by Dobly."),
        status: String(row.status ?? "needs_review"),
        priority: row.status === "needs_review" ? "high" as const : "medium" as const,
        ownerLabel: row.customers?.full_name ?? row.customers?.email ?? row.customers?.phone ?? null,
        moneyLabel: money(row.amount, row.currency),
        nextAction: row.next_action ? String(row.next_action) : "Review the financial context.",
        createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
      })),
      ...invoiceRows.map((row: any) => ({
        id: String(row.id),
        kind: "invoice" as const,
        title: `Invoice ${String(row.external_invoice_id ?? row.id).slice(0, 10)}`,
        summary: String(row.notes ?? `Invoice is ${row.status ?? "issued"}.`),
        status: String(row.status ?? "issued"),
        priority: row.status === "overdue" ? "high" as const : "medium" as const,
        ownerLabel: row.customers?.full_name ?? row.customers?.email ?? row.customers?.phone ?? null,
        moneyLabel: money(row.amount, row.currency),
        nextAction: row.status === "overdue" ? "Prepare a respectful payment follow-up." : "Keep payment status synced.",
        createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
      })),
    ];
  } else if (params.departmentId === "operations") {
    const rows = await safeRows(() =>
      admin
        .from("operations_items")
        .select("*, customers(full_name, phone, email)")
        .in("workspace_id", workspaceIds)
        .order("created_at", { ascending: false })
        .limit(24),
    );
    records = rows.map((row: any) => ({
      id: String(row.id),
      kind: "operations_item",
      title: String(row.title ?? "Operations item"),
      summary: String(row.summary ?? "Operations item captured by Dobly."),
      status: String(row.status ?? "open"),
      priority: priority(row.priority),
      ownerLabel: row.owner_label ?? row.customers?.full_name ?? null,
      moneyLabel: null,
      nextAction: row.next_action ? String(row.next_action) : "Identify owner, blocker, dependency, and due date.",
      createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }));
  } else if (params.departmentId === "reception") {
    const rows = await safeRows(() =>
      admin
        .from("communication_conversations")
        .select("*")
        .in("workspace_id", workspaceIds)
        .order("last_message_at", { ascending: false })
        .limit(24),
    );
    records = rows.map((row: any) => ({
      id: String(row.id),
      kind: "conversation",
      title: String(row.contact_name ?? row.contact_identifier ?? "Conversation"),
      summary: String(row.summary ?? "Inbound conversation."),
      status: String(row.status ?? "open"),
      priority: priority(row.risk_level),
      ownerLabel: String(row.channel ?? "channel"),
      moneyLabel: null,
      nextAction: row.status === "waiting_owner" ? "Review before Dobly replies." : "Route or continue conversation.",
      createdAt: String(row.last_message_at ?? row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }));
  } else if (params.departmentId === "marketing" || params.departmentId === "creative") {
    const rows = await safeRows(() =>
      admin
        .from("content_items")
        .select("*")
        .eq("user_id", params.userId)
        .order("updated_at", { ascending: false })
        .limit(24),
    );
    records = rows.map((row: any) => ({
      id: String(row.id),
      kind: "content_item",
      title: String(row.title ?? "Content item"),
      summary: String(row.body ?? "Content item prepared by Dobly.").slice(0, 600),
      status: String(row.status ?? "draft"),
      priority: row.status === "needs_review" ? "high" : "medium",
      ownerLabel: String(row.channel ?? (params.departmentId === "creative" ? "creative" : "content")),
      moneyLabel: null,
      nextAction:
        params.departmentId === "creative"
          ? "Review the asset direction and approve the next revision."
          : row.status === "draft" || row.status === "needs_review"
            ? "Review and approve before scheduling."
            : "Track performance.",
      createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }));
  } else if (params.departmentId === "engineering") {
    const rows = await safeRows(() =>
      admin
        .from("action_candidates")
        .select("*")
        .in("workspace_id", workspaceIds)
        .order("updated_at", { ascending: false })
        .limit(24),
    );
    records = rows.map((row: any) => ({
      id: String(row.id),
      kind: "engineering_item",
      title: String(row.title ?? "Engineering item"),
      summary: String(row.summary ?? "Technical work candidate prepared by Dobly."),
      status: String(row.status ?? "open"),
      priority: priority(row.risk_level),
      ownerLabel: String(row.action_kind ?? "technical handoff").replaceAll("_", " "),
      moneyLabel: null,
      nextAction: row.status === "open" ? "Review context, assign owner, and approve the next technical move." : "Keep the release context updated.",
      createdAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }));
  } else {
    const rows = await safeRows(() =>
      admin
        .from("customers")
        .select("*")
        .in("workspace_id", workspaceIds)
        .order("last_seen_at", { ascending: false })
        .limit(18),
    );
    records = rows.map((row: any) => ({
      id: String(row.id),
      kind: "customer",
      title: String(row.full_name ?? "Customer"),
      summary: String(row.relationship_summary ?? "Business relationship stored in Filing Cabinet."),
      status: "known",
      priority: Number(row.churn_risk_score ?? 0) > 0.7 ? "high" : "medium",
      ownerLabel: row.email ?? row.phone ?? null,
      moneyLabel: money(row.lifetime_value, "KES"),
      nextAction: "Use this record as context for the department.",
      createdAt: String(row.last_seen_at ?? row.updated_at ?? row.created_at ?? new Date().toISOString()),
    }));
  }

  const sorted = newestFirst(records).slice(0, 30);
  const needsAction = sorted.filter((record) =>
    /open|new|needs_review|waiting|queued|overdue|blocked/i.test(record.status),
  ).length;
  const highPriority = sorted.filter((record) => record.priority === "high" || record.priority === "critical").length;

  return {
    workspaceIds,
    records: sorted,
    metrics: [
      metric("Operating records", sorted.length, "Real objects this department can work on."),
      metric("Needs action", needsAction, "Records currently asking for movement."),
      metric("High priority", highPriority, "Sensitive, blocked, valuable, or risky items."),
    ],
  };
}
