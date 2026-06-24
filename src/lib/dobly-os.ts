import { createAdminSupabaseClient } from "@/lib/supabase/server";
import {
  DOBLY_BUSINESS_WORKERS,
  DOBLY_INDIVIDUAL_WORKERS,
  DOBLY_MEMORY_TIERS,
  type DoblyReadiness,
  type DoblyWorkerDefinition,
} from "@/lib/dobly-product-model";
import { listAccessibleWorkspaces, type WorkspaceRecord } from "@/lib/workspaces";
import { listSoftwareExecutionTools } from "@/lib/software-execution";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { getDoblyConsolidationSummary } from "@/lib/dobly-platform";
import type { Connection } from "@/types";
import type { HomebaseDashboardData } from "@/lib/office/homebase";
import type { OfficeDepartmentId } from "@/lib/office/types";

export type DoblySpaceKind = "business" | "personal" | "family" | "project";
export type DoblyCapabilityKey =
  | "communication"
  | "coordination"
  | "operations"
  | "research"
  | "software_execution"
  | "artifact_creation"
  | "publishing_delivery"
  | "monitoring"
  | "memory"
  | "decision_support"
  | "command_oversight";

export interface DoblySpaceSummary {
  id: string;
  name: string;
  kind: DoblySpaceKind;
  status: "active" | "paused" | "archived";
  source: "workspace" | "personal_default";
  updatedAt: string;
  activeAgents: number;
  openTasks: number;
  pendingApprovals: number;
  connectedChannels: number;
}

export interface DoblyCapabilitySummary {
  key: DoblyCapabilityKey;
  label: string;
  description: string;
  readiness: DoblyReadiness;
  liveCount: number;
  missing: string[];
}

export interface DoblyAgentTemplateSummary {
  id: string;
  title: string;
  area: string;
  audience: "business" | "personal" | "both";
  readiness: DoblyReadiness;
  mission: string;
  required: string[];
}

export interface DoblyCoordinationIssue {
  id: string;
  title: string;
  summary: string;
  departments: string[];
  departmentIds: string[];
  workerNames: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  pressureScore: number;
  recommendedAction: string;
  owner: "general_manager" | "board";
}

export interface DoblyLeadershipSummary {
  generalManager: {
    headline: string;
    summary: string;
    coordinationIssues: DoblyCoordinationIssue[];
    routedDepartments: number;
    watchingStates: number;
    pendingApprovals: number;
  };
  board: {
    headline: string;
    summary: string;
    strategicRisks: string[];
    strategicOpportunities: string[];
    ownerDecisions: string[];
  };
}

export interface DoblyOSHomeData {
  spaces: DoblySpaceSummary[];
  capabilities: DoblyCapabilitySummary[];
  agentTemplates: DoblyAgentTemplateSummary[];
  systemHealth: {
    activeAgents: number;
    openTasks: number;
    pendingApprovals: number;
    activeConnections: number;
    memoryReadiness: DoblyReadiness;
  };
  briefing: {
    headline: string;
    focus: string;
    nextActions: string[];
  };
  leadership: DoblyLeadershipSummary;
}

const CAPABILITIES: Array<Omit<DoblyCapabilitySummary, "liveCount">> = [
  {
    key: "communication",
    label: "Communication",
    description: "Phone, SMS, WhatsApp, email, chat, and human handoffs.",
    readiness: "partial",
    missing: ["LiveKit handoff layer", "full channel policy enforcement"],
  },
  {
    key: "coordination",
    label: "Coordination",
    description: "Tasks, reminders, schedules, approvals, and follow-through.",
    readiness: "partial",
    missing: ["durable background orchestration for every long-running path"],
  },
  {
    key: "operations",
    label: "Operations",
    description: "Operators that own outcomes across business, work, and life with visible execution state.",
    readiness: "partial",
    missing: ["more verified end-to-end Operator runs"],
  },
  {
    key: "research",
    label: "Research",
    description: "Live context, market scans, web extraction, and decision briefings.",
    readiness: "partial",
    missing: ["Perplexity runtime", "Firecrawl extraction pipeline"],
  },
  {
    key: "software_execution",
    label: "Software Execution",
    description: "Dobly operates real software and tool systems without exposing technical setup.",
    readiness: "planned",
    missing: ["MCP/tool server registry", "reviewable artifact loop", "tool permission model"],
  },
  {
    key: "artifact_creation",
    label: "Artifact Creation",
    description: "Reports, specs, documents, decks, spreadsheets, invoices, media, and designs.",
    readiness: "partial",
    missing: ["media render pipeline", "artifact versioning"],
  },
  {
    key: "publishing_delivery",
    label: "Publishing and Delivery",
    description: "Send, post, share, upload, submit, and dispatch finished outputs.",
    readiness: "partial",
    missing: ["cross-platform social scheduling", "approval-before-publish defaults"],
  },
  {
    key: "monitoring",
    label: "Monitoring",
    description: "Watchers for money, markets, operations, travel, competitors, and risk.",
    readiness: "planned",
    missing: ["watcher scheduler", "condition memory", "notification preferences"],
  },
  {
    key: "memory",
    label: "Memory",
    description: "Context, preferences, rules, history, decisions, and workspace knowledge.",
    readiness: "partial",
    missing: ["long-term vector memory", "nightly synthesis jobs"],
  },
  {
    key: "decision_support",
    label: "Decision Support",
    description: "What matters, why it matters, and what Dobly recommends next.",
    readiness: "partial",
    missing: ["source-grounded recommendations", "outcome feedback loop"],
  },
  {
    key: "command_oversight",
    label: "Command and Oversight",
    description: "One place to see, guide, approve, pause, and inspect Dobly.",
    readiness: "partial",
    missing: ["unified space switcher", "Operator-wide audit view"],
  },
];

function inferSpaceKind(workspace: WorkspaceRecord): DoblySpaceKind {
  const name = workspace.name.toLowerCase();
  if (name.includes("family")) return "family";
  if (name.includes("life") || name.includes("personal") || name.includes("invest")) return "personal";
  if (name.includes("project") || name.includes("travel")) return "project";
  return "business";
}

function readinessRank(value: DoblyReadiness) {
  if (value === "verified_live") return 3;
  if (value === "partial") return 2;
  return 1;
}

function weakestReadiness(values: DoblyReadiness[]): DoblyReadiness {
  const sorted = [...values].sort((a, b) => readinessRank(a) - readinessRank(b));
  return sorted[0] ?? "planned";
}

function mapTemplate(template: DoblyWorkerDefinition): DoblyAgentTemplateSummary {
  const personal = template.audience.includes("individual");
  const business = template.audience.includes("business_owner") || template.audience.includes("freelancer");
  return {
    id: template.id,
    title: template.title,
    area: template.officeOrArea,
    audience: personal && business ? "both" : personal ? "personal" : "business",
    readiness: template.readiness,
    mission: template.mission,
    required: template.livePrerequisites,
  };
}

function buildLeadershipSummary(office: HomebaseDashboardData): DoblyLeadershipSummary {
  const waitingTasks = office.tasks.filter((task) => task.status === "waiting_approval");
  const attentionDepartments = office.departments.filter((department) => department.status === "needs_attention");
  const openActionCandidates = office.actionCandidates.filter((candidate) => ["open", "approved", "executing"].includes(candidate.status));
  const driftingStates = office.states.filter((state) => !["healthy", "stable"].includes(String(state.healthStatus)));

  const departmentNameById = new Map(office.departments.map((department) => [department.id, department.name]));
  const workerNameByKey = new Map(office.workers.map((worker) => [worker.workerKey, worker.name]));
  const issues: DoblyCoordinationIssue[] = [];

  if (waitingTasks.length > 0) {
    const departmentIds = Array.from(new Set(waitingTasks.map((task) => task.departmentId))).slice(0, 4);
    const departments = departmentIds.map((departmentId) => departmentNameById.get(departmentId) ?? departmentId);
    const workerNames = Array.from(
      new Set(waitingTasks.map((task) => workerNameByKey.get(task.workerKey)).filter(Boolean) as string[]),
    ).slice(0, 4);
    const highestRisk = waitingTasks.some((task) => task.riskLevel === "critical")
      ? "critical"
      : waitingTasks.some((task) => task.riskLevel === "high")
        ? "high"
        : "medium";

    issues.push({
      id: "approvals-blocking-work",
      title: "Owner approvals are slowing live work",
      summary: `${waitingTasks.length} approval-gated task${waitingTasks.length === 1 ? "" : "s"} are waiting across ${departments.length} department${departments.length === 1 ? "" : "s"}.`,
      departments,
      departmentIds,
      workerNames,
      riskLevel: highestRisk,
      pressureScore: Math.min(96, 40 + waitingTasks.length * 9),
      recommendedAction: "Clear the oldest approvals first, then tighten which actions truly need owner review so proven coworkers can keep moving.",
      owner: highestRisk === "critical" || highestRisk === "high" ? "board" : "general_manager",
    });
  }

  if (attentionDepartments.length >= 2) {
    const departmentIds = attentionDepartments.slice(0, 5).map((department) => department.id);
    const departments = attentionDepartments.slice(0, 5).map((department) => department.name);
    const workerNames = office.workers
      .filter((worker) => attentionDepartments.some((department) => department.id === worker.departmentId))
      .slice(0, 5)
      .map((worker) => worker.name);

    issues.push({
      id: "cross-department-pressure",
      title: "Cross-department pressure is building",
      summary: `${departments.join(", ")} all have live pressure at the same time, which means the General Manager should coordinate handoffs instead of leaving each room isolated.`,
      departments,
      departmentIds,
      workerNames,
      riskLevel: attentionDepartments.length >= 4 ? "high" : "medium",
      pressureScore: Math.min(98, 32 + attentionDepartments.length * 12),
      recommendedAction: "Route the highest-pressure blockers into one coordination plan and assign the next move explicitly to the right coworker or department.",
      owner: attentionDepartments.length >= 4 ? "board" : "general_manager",
    });
  }

  if (openActionCandidates.length > 0) {
    const departmentIds = Array.from(
      new Set(openActionCandidates.map((candidate) => candidate.deskId).filter(Boolean).map(String)),
    ).slice(0, 4);
    const departments = departmentIds.map((deskId) => departmentNameById.get(deskId as OfficeDepartmentId) ?? deskId);

    issues.push({
      id: "recovery-actions-open",
      title: "Recovery actions are ready but not fully routed",
      summary: `${openActionCandidates.length} action candidate${openActionCandidates.length === 1 ? "" : "s"} exist, which means Dobly already knows possible recoveries but still needs clearer ownership of the next move.`,
      departments,
      departmentIds,
      workerNames: [],
      riskLevel: openActionCandidates.some((candidate) => ["high", "critical"].includes(String(candidate.riskLevel))) ? "high" : "medium",
      pressureScore: Math.min(88, 24 + openActionCandidates.length * 10),
      recommendedAction: "Promote the highest-value recovery actions into owned coworker work instead of leaving them as passive recommendations.",
      owner: "general_manager",
    });
  }

  if (driftingStates.length > 0) {
    const departmentIds = Array.from(
      new Set(driftingStates.map((state) => state.deskId).filter(Boolean).map(String)),
    ).slice(0, 4);
    issues.push({
      id: "state-drift",
      title: "Important outcomes are drifting",
      summary: `${driftingStates.length} operating state${driftingStates.length === 1 ? "" : "s"} are not healthy, which means Dobly needs stronger outcome ownership instead of just task execution.`,
      departments: departmentIds.map((deskId) => departmentNameById.get(deskId as OfficeDepartmentId) ?? deskId),
      departmentIds,
      workerNames: [],
      riskLevel: driftingStates.length >= 3 ? "high" : "medium",
      pressureScore: Math.min(92, 26 + driftingStates.length * 11),
      recommendedAction: "Translate each drifting state into a visible owner, a recovery loop, and a rule for when the General Manager should escalate it.",
      owner: driftingStates.length >= 3 ? "board" : "general_manager",
    });
  }

  const coordinationIssues = issues
    .sort((a, b) => b.pressureScore - a.pressureScore)
    .slice(0, 5);

  const strategicRisks = coordinationIssues
    .filter((issue) => issue.owner === "board" || ["high", "critical"].includes(issue.riskLevel))
    .map((issue) => `${issue.title}: ${issue.summary}`)
    .slice(0, 4);

  const strategicOpportunities = office.departments
    .filter((department) => department.activeWorkers > 0 && department.approvalCount === 0 && department.status !== "needs_attention")
    .slice(0, 4)
    .map(
      (department) =>
        `${department.name} has ${department.activeWorkers} active coworker${department.activeWorkers === 1 ? "" : "s"} and low friction right now, which makes it a good place to push more output or delegation.`,
    );

  const ownerDecisions = coordinationIssues
    .filter((issue) => issue.owner === "board")
    .map((issue) => issue.recommendedAction)
    .slice(0, 4);

  return {
    generalManager: {
      headline:
        coordinationIssues[0]?.title ??
        "The General Manager is watching the office and waiting for more live pressure to coordinate.",
      summary:
        coordinationIssues[0]?.summary ??
        "As more coworkers own real work, the General Manager will route blockers, handoffs, and recovery actions across departments.",
      coordinationIssues,
      routedDepartments: attentionDepartments.length,
      watchingStates: office.states.length,
      pendingApprovals: waitingTasks.length,
    },
    board: {
      headline:
        strategicRisks[0] ??
        "The Board currently sees no record-backed strategic emergency, which means Dobly can stay execution-heavy.",
      summary:
        strategicRisks.length > 0
          ? "Board-level attention is needed where cross-department pressure, stalled approvals, or outcome drift threaten the business."
          : "The Board has room to focus on leverage and growth rather than firefighting.",
      strategicRisks,
      strategicOpportunities,
      ownerDecisions,
    },
  };
}

export async function buildDoblyOSHomeData(params: {
  userId: string;
  office: HomebaseDashboardData;
  connections: Connection[];
}): Promise<DoblyOSHomeData> {
  const admin = createAdminSupabaseClient();
  const workspaces = await listAccessibleWorkspaces(params.userId).catch(() => []);
  const activeConnections = params.connections.filter((connection) => connection.status === "active");
  const softwareTools = listSoftwareExecutionTools();
  const pendingApprovals = params.office.tasks.filter((task) => task.status === "waiting_approval").length;
  const operators = await listDoblyOperators({ userId: params.userId }).catch((): OperatorWithLoops[] => []);
  const activeAgents = operators.filter((operator) => operator.status === "active").length ||
    params.office.workers.filter((worker) => ["active", "running", "shadow"].includes(worker.status)).length;
  const openTasks = params.office.tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length;

  const agentRows = await admin
    .from("agents")
    .select("workspace_id,status")
    .eq("user_id", params.userId)
    .in("status", ["active", "draft", "paused"])
    .then(({ data }) => data ?? [])
    .catch(() => []);

  const connectionRows = await admin
    .from("connections")
    .select("id,workspace_id,status")
    .eq("user_id", params.userId)
    .eq("status", "active")
    .then(({ data }) => data ?? [])
    .catch(() => []);

  const spaces: DoblySpaceSummary[] = [
    {
      id: "personal",
      name: "My Life",
      kind: "personal",
      status: "active",
      source: "personal_default",
      updatedAt: new Date().toISOString(),
      activeAgents: operators.filter((operator) => !operator.workspace_id).length || agentRows.filter((row: any) => !row.workspace_id).length,
      openTasks: params.office.tasks.filter((task) => !task.departmentId).length,
      pendingApprovals: pendingApprovals,
      connectedChannels: connectionRows.filter((row: any) => !row.workspace_id).length,
    },
    ...workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      kind: inferSpaceKind(workspace),
      status: workspace.status,
      source: "workspace" as const,
      updatedAt: workspace.updated_at,
      activeAgents: operators.filter((operator) => operator.workspace_id === workspace.id).length || agentRows.filter((row: any) => row.workspace_id === workspace.id).length,
      openTasks: params.office.tasks.filter((task) => task.departmentId).length,
      pendingApprovals,
      connectedChannels: connectionRows.filter((row: any) => row.workspace_id === workspace.id).length,
    })),
  ];

  const capabilities = CAPABILITIES.map((capability) => ({
    ...capability,
    liveCount:
      capability.key === "communication"
        ? activeConnections.filter((connection) => ["google", "slack", "whatsapp", "twilio", "mailchimp"].includes(connection.provider)).length
        : capability.key === "software_execution"
          ? softwareTools.filter((tool) => tool.configured).length
        : capability.key === "operations"
          ? operators.length + params.office.workers.length + params.office.states.length
          : capability.key === "memory"
            ? DOBLY_MEMORY_TIERS.filter((tier) => tier.readiness !== "planned").length
            : capability.key === "command_oversight"
              ? params.office.actionCandidates.length + params.office.recentEvents.length
              : 0,
  }));

  const agentTemplates = [...DOBLY_BUSINESS_WORKERS, ...DOBLY_INDIVIDUAL_WORKERS].map(mapTemplate);
  const platform = getDoblyConsolidationSummary();
  const memoryReadiness = weakestReadiness(DOBLY_MEMORY_TIERS.map((tier) => tier.readiness));
  const urgent = params.office.tasks.find((task) => task.status === "waiting_approval" || task.riskLevel === "high");
  const partialCapabilities = capabilities.filter((capability) => capability.readiness === "partial").length;
  const leadership = buildLeadershipSummary(params.office);

  return {
    spaces,
    capabilities,
    agentTemplates,
    systemHealth: {
      activeAgents,
      openTasks,
      pendingApprovals,
      activeConnections: activeConnections.length,
      memoryReadiness,
    },
    briefing: {
      headline: pendingApprovals > 0 ? `${pendingApprovals} decision${pendingApprovals === 1 ? "" : "s"} waiting` : "Dobly is ready for your next Operator",
      focus: urgent?.title ?? `${partialCapabilities} core capabilities are partly built and ready to connect to Operators.`,
      nextActions: [
        platform.promise,
        "Create one business coworker and one life coworker from the same command center.",
        "Keep APIs, MCP, queues, and runtime complexity hidden behind Connections, Loops, Runs, and Approvals.",
      ],
    },
    leadership,
  };
}
