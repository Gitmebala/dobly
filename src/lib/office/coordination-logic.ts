import type { BusinessMemoryKind, BusinessMemoryScope } from "@/lib/business-memory";
import type { OfficeDepartmentId } from "@/lib/office/types";

export interface HandoffBranchPlan {
  label: string;
  route: OfficeDepartmentId[];
}

const POLICY_SCOPES = new Set<BusinessMemoryScope>([
  "global",
  "reception",
  "sales",
  "support",
  "finance",
  "operations",
  "general_manager",
  "boardroom",
]);

function normalizeDepartmentId(value: unknown): OfficeDepartmentId | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value.trim() as OfficeDepartmentId;
}

function humanizeDepartment(value: string) {
  return value.replaceAll("_", " ");
}

export function nextHandoffDepartment(params: {
  route?: unknown;
  currentDepartmentId: string;
  currentIndex?: unknown;
}) {
  const route = Array.isArray(params.route)
    ? params.route
        .map((entry) => normalizeDepartmentId(entry))
        .filter((entry): entry is OfficeDepartmentId => Boolean(entry))
    : [];
  const explicitIndex = typeof params.currentIndex === "number" ? params.currentIndex : Number(params.currentIndex);
  const currentIndex =
    Number.isFinite(explicitIndex) && explicitIndex >= 0
      ? explicitIndex
      : route.findIndex((entry) => entry === params.currentDepartmentId);
  const normalizedCurrentIndex = currentIndex >= 0 ? currentIndex : route.findIndex((entry) => entry === params.currentDepartmentId);
  const nextDepartmentId =
    normalizedCurrentIndex >= 0 && normalizedCurrentIndex + 1 < route.length ? route[normalizedCurrentIndex + 1] : null;

  return {
    route,
    currentIndex: normalizedCurrentIndex,
    nextDepartmentId,
    isFinal: !nextDepartmentId,
  };
}

export function inferImplicitHandoffRoute(params: {
  currentDepartmentId: string;
  sourceRecordKind?: string | null;
}) {
  const kind = String(params.sourceRecordKind ?? "").toLowerCase();
  const current = params.currentDepartmentId;

  if (kind === "lead" && current === "reception") return ["reception", "sales"] as OfficeDepartmentId[];
  if (kind === "lead" && current === "sales") return ["sales", "projects"] as OfficeDepartmentId[];
  if (kind === "lead" && current === "marketing") return ["marketing", "sales"] as OfficeDepartmentId[];
  if (kind === "support_case" && current === "support") return ["support", "operations"] as OfficeDepartmentId[];
  if (kind === "support_case" && current === "operations") return ["operations", "support"] as OfficeDepartmentId[];
  if (kind === "invoice" && current === "sales") return ["sales", "finance"] as OfficeDepartmentId[];
  if (kind === "invoice" && current === "finance") return ["finance", "general_manager"] as OfficeDepartmentId[];
  if (kind === "finance_record" && current === "finance") return ["finance", "general_manager"] as OfficeDepartmentId[];
  if (kind === "content_item" && current === "marketing") return ["marketing", "sales"] as OfficeDepartmentId[];
  if (kind === "content_item" && current === "sales") return ["sales", "projects"] as OfficeDepartmentId[];
  if (kind === "operations_item" && current === "operations") return ["operations", "projects"] as OfficeDepartmentId[];
  if (kind === "operations_item" && current === "projects") return ["projects", "support"] as OfficeDepartmentId[];
  if (kind === "conversation" && current === "reception") return ["reception", "support"] as OfficeDepartmentId[];
  if (kind === "conversation" && current === "support") return ["support", "general_manager"] as OfficeDepartmentId[];
  if (kind === "customer" && current === "support") return ["support", "sales"] as OfficeDepartmentId[];

  return [] as OfficeDepartmentId[];
}

export function inferImplicitHandoffBranches(params: {
  currentDepartmentId: string;
  sourceRecordKind?: string | null;
  summary?: string | null;
}) {
  const kind = String(params.sourceRecordKind ?? "").toLowerCase();
  const current = params.currentDepartmentId;
  const summary = String(params.summary ?? "").toLowerCase();

  const branches: HandoffBranchPlan[] = [];

  if (kind === "content_item" && current === "marketing") {
    branches.push(
      { label: "go_to_sales", route: ["marketing", "sales"] },
      { label: "measure_in_analytics", route: ["marketing", "analytics"] },
    );
  }

  if (kind === "support_case" && current === "support") {
    branches.push({ label: "service_recovery", route: ["support", "operations"] });
    if (/refund|credit|payment|billing|invoice|charge/.test(summary)) {
      branches.push({ label: "financial_review", route: ["support", "finance"] });
    }
  }

  if (kind === "lead" && current === "sales") {
    branches.push({ label: "delivery_planning", route: ["sales", "projects"] });
    if (/payment|invoice|deposit|pricing|quote|proposal/.test(summary)) {
      branches.push({ label: "commercial_followthrough", route: ["sales", "finance"] });
    }
  }

  if (kind === "operations_item" && current === "operations") {
    branches.push({ label: "delivery_coordination", route: ["operations", "projects"] });
    if (/delay|customer|handoff|delivery/.test(summary)) {
      branches.push({ label: "customer_update", route: ["operations", "support"] });
    }
  }

  if (kind === "conversation" && current === "reception") {
    branches.push({ label: "service_followup", route: ["reception", "support"] });
    if (/lead|quote|book|buy|proposal/.test(summary)) {
      branches.push({ label: "revenue_followup", route: ["reception", "sales"] });
    }
  }

  return branches;
}

export function inferBoardDirectiveMemory(params: {
  title: string;
  summary: string;
  recommendedAction: string;
  departmentIds?: string[];
}) {
  const text = [params.title, params.summary, params.recommendedAction, ...(params.departmentIds ?? [])].join(" ").toLowerCase();
  let kind: BusinessMemoryKind = "decision";

  if (/policy|risk|approval|governance|escalat|compliance/.test(text)) kind = "escalation_rule";
  else if (/invoice|payment|collections|cash|reconcile|finance/.test(text)) kind = "finance_rule";
  else if (/lead|proposal|pipeline|pricing|follow-up|follow up|sales/.test(text)) kind = "sales_rule";
  else if (/support|complaint|refund|ticket|customer recovery/.test(text)) kind = "support_rule";
  else if (/tone|voice|brand/.test(text)) kind = "tone";
  else if (/rule|guardrail|must|always|never/.test(text)) kind = "policy";

  const scopedDepartment = (
    (params.departmentIds ?? [])
      .map((entry) => normalizeDepartmentId(entry))
      .find((entry) => Boolean(entry) && POLICY_SCOPES.has(entry as BusinessMemoryScope)) ?? "global"
  ) as BusinessMemoryScope;
  const scope = scopedDepartment;

  return {
    kind,
    scope,
    title: `Board directive: ${params.title}`,
    body: [
      `Board directive for ${params.title}.`,
      `Why this matters: ${params.summary}`,
      `Preferred handling: ${params.recommendedAction}`,
      params.departmentIds?.length
        ? `Primary departments: ${params.departmentIds.map((entry) => humanizeDepartment(entry)).join(", ")}.`
        : null,
      "This directive should influence future coworker behavior, not only the current task.",
    ]
      .filter(Boolean)
      .join(" "),
    tags: Array.from(
      new Set(
        [
          "board-directive",
          "leadership",
          "coordination",
          ...((params.departmentIds ?? []).map((entry) => String(entry).toLowerCase()).filter(Boolean) as string[]),
        ].slice(0, 12),
      ),
    ),
    departmentId: scopedDepartment === "global" ? "boardroom" : scopedDepartment,
  };
}
