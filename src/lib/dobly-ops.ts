import type {
  Approval,
  BusinessProfile,
  Connection,
  Profile,
  Workflow,
  WorkflowRun,
  WorkflowVersion,
} from "@/types";

export type DoblyFocusWedge =
  | "ai_workflow_builder_for_service_businesses"
  | "approval_safe_ai_automations"
  | "ai_operations_for_smb_teams";

export interface DoblyWorkspaceRecommendation {
  id: string;
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  href: string;
  cta: string;
}

export interface DoblyWorkspaceSnapshot {
  workspaceLabel: string;
  corePromise: string;
  operatingModel: string;
  focusWedge: DoblyFocusWedge;
  focusReason: string;
  businessMemory: string[];
  policySummary: string[];
  metrics: {
    activeSystems: number;
    ranToday: number;
    failedToday: number;
    waitingApprovals: number;
    reconnectNeeded: number;
    changedRecently: number;
    timeSavedHours: number;
  };
  whatNeedsAttention: string[];
  recommendations: DoblyWorkspaceRecommendation[];
}

export interface DoblyGenerationBrief {
  workspaceMemory: string[];
  policySummary: string[];
  confidence: number;
  confidenceLabel: "high" | "medium" | "needs_review";
  confidenceReason: string;
  assumptions: string[];
  approvalPoints: string[];
  failureModes: string[];
  whatThisIs: string;
  whyBuiltThisWay: string;
  whatHappensNext: string[];
  defaults: {
    operatorType: "automation" | "agent" | "pipeline" | "hybrid" | "report";
    triggerStrategy: string;
    approvalPolicy: string;
    retryPolicy: string;
    firstConnection: string;
  };
}

function normalizedText(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function humanizeProvider(provider: string) {
  return provider
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getWorkflowKind(workflow: Workflow) {
  const runtimeMode = workflow.blueprint?.definition?.runtime?.mode;
  const hasOperator = Boolean(workflow.blueprint?.definition?.operator?.enabled);

  if (runtimeMode === "pipeline") return "pipeline";
  if (runtimeMode === "hybrid") return "hybrid";
  if (runtimeMode === "agent" || hasOperator) return "agent";
  if (workflow.blueprint?.category === "Data & Reporting") return "report";
  return "automation";
}

function inferFocusWedge(
  businessProfile: BusinessProfile | null,
  workflows: Workflow[],
  approvals: Approval[],
) {
  const text = normalizedText(
    businessProfile?.business_type,
    businessProfile?.description,
    businessProfile?.context_summary,
    ...workflows.map((workflow) => workflow.title),
  );

  if (
    /service|clinic|agency|consult|appointment|booking|invoice|lead|intake|repair|studio|salon|dental|roofing/.test(
      text,
    )
  ) {
    return {
      wedge: "ai_workflow_builder_for_service_businesses" as const,
      reason: "Your workspace already looks service-led, so Dobly should bias toward lead flow, scheduling, invoicing, and follow-up systems.",
    };
  }

  if (approvals.length > 0 || /refund|quote|billing|payment|approval|discount/.test(text)) {
    return {
      wedge: "approval_safe_ai_automations" as const,
      reason: "This workspace has sensitive actions and human checkpoints, so Dobly should emphasize approvals, thresholds, and exception-safe execution.",
    };
  }

  return {
    wedge: "ai_operations_for_smb_teams" as const,
    reason: "The broadest fit is operational orchestration across connected tools, approvals, and reporting for a small team.",
  };
}

function buildMemory(profile: {
  businessProfile: BusinessProfile | null;
  workflows: Workflow[];
  connections: Connection[];
  notificationPreference: string | null | undefined;
}) {
  const { businessProfile, workflows, connections, notificationPreference } = profile;
  const memory: string[] = [];

  if (businessProfile?.business_name) {
    memory.push(
      `${businessProfile.business_name}${
        businessProfile.business_type ? ` is a ${businessProfile.business_type}` : ""
      }.`,
    );
  }

  if (businessProfile?.context_summary) {
    memory.push(businessProfile.context_summary);
  } else if (businessProfile?.description) {
    memory.push(businessProfile.description);
  }

  if (businessProfile?.brand_voice) {
    memory.push(`Preferred tone: ${businessProfile.brand_voice}.`);
  }

  if (businessProfile?.opening_hours) {
    memory.push(`Operating hours: ${businessProfile.opening_hours}.`);
  }

  const activeKinds = workflows.reduce(
    (acc, workflow) => {
      const kind = getWorkflowKind(workflow);
      acc[kind] += 1;
      return acc;
    },
    { automation: 0, agent: 0, pipeline: 0, hybrid: 0, report: 0 },
  );

  const activeParts = Object.entries(activeKinds)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${count} ${kind}${count === 1 ? "" : "s"}`);
  if (activeParts.length > 0) {
    memory.push(`Workspace already runs ${activeParts.join(", ")}.`);
  }

  const connectedProviders = connections.slice(0, 4).map((connection) => humanizeProvider(connection.provider));
  if (connectedProviders.length > 0) {
    memory.push(`Connected systems include ${connectedProviders.join(", ")}.`);
  }

  if (notificationPreference) {
    memory.push(`Primary operator alert channel: ${notificationPreference}.`);
  }

  return memory.slice(0, 6);
}

function buildPolicies(
  businessProfile: BusinessProfile | null,
  notificationPreference: string | null | undefined,
  approvals: Approval[],
) {
  const policies = [...(businessProfile?.policies ?? [])];

  if (businessProfile?.opening_hours) {
    policies.push(`Prefer customer-facing actions during ${businessProfile.opening_hours}.`);
  }

  if (notificationPreference) {
    policies.push(`Route exceptions and approvals to ${notificationPreference} first.`);
  }

  if (approvals.some((approval) => approval.risk_level === "high")) {
    policies.push("High-risk actions should pause for explicit approval.");
  }

  return Array.from(new Set(policies)).slice(0, 8);
}

export function buildDoblyWorkspaceSnapshot(params: {
  profile: Profile | null;
  businessProfile: BusinessProfile | null;
  workflows: Workflow[];
  runs: WorkflowRun[];
  approvals: Approval[];
  connections: Connection[];
  versions?: WorkflowVersion[];
}) {
  const { profile, businessProfile, workflows, runs, approvals, connections, versions = [] } = params;
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const activeSystems = workflows.filter((workflow) => workflow.status === "active").length;
  const ranToday = runs.filter((run) => run.started_at.slice(0, 10) === todayKey).length;
  const failedToday = runs.filter(
    (run) => run.started_at.slice(0, 10) === todayKey && run.status === "failed",
  ).length;
  const waitingApprovals = approvals.filter((approval) => approval.status === "pending").length;
  const reconnectNeeded = connections.filter((connection) => connection.status !== "active").length;
  const changedRecently = versions.filter((version) => {
    const diff = today.getTime() - new Date(version.created_at).getTime();
    return diff <= 1000 * 60 * 60 * 24 * 7;
  }).length;
  const timeSavedHours = Math.round(
    workflows.reduce((sum, workflow) => sum + (workflow.time_saved_minutes ?? 0), 0) / 60,
  );

  const { wedge, reason } = inferFocusWedge(businessProfile, workflows, approvals);
  const businessMemory = buildMemory({
    businessProfile,
    workflows,
    connections,
    notificationPreference: profile?.notification_preference,
  });
  const policySummary = buildPolicies(businessProfile, profile?.notification_preference, approvals);

  const whatNeedsAttention: string[] = [];
  if (waitingApprovals > 0) {
    whatNeedsAttention.push(`${waitingApprovals} workflow decision${waitingApprovals === 1 ? "" : "s"} waiting on approval.`);
  }
  if (failedToday > 0) {
    whatNeedsAttention.push(`${failedToday} run${failedToday === 1 ? "" : "s"} failed today and need review.`);
  }
  if (reconnectNeeded > 0) {
    whatNeedsAttention.push(`${reconnectNeeded} connection${reconnectNeeded === 1 ? "" : "s"} need reconnecting.`);
  }
  if (whatNeedsAttention.length === 0) {
    whatNeedsAttention.push("No urgent operator intervention is needed right now.");
  }

  const recommendations: DoblyWorkspaceRecommendation[] = [];
  if (!businessProfile?.context_summary || !(businessProfile?.policies?.length ?? 0)) {
    recommendations.push({
      id: "complete-memory",
      title: "Finish workspace memory and policies",
      reason: "Dobly gets sharper when it knows your business rules, tone, and constraints before generation starts.",
      priority: "high",
      href: "/dashboard/business",
      cta: "Open memory",
    });
  }
  if (connections.length === 0) {
    recommendations.push({
      id: "connect-one-tool",
      title: "Connect one production tool",
      reason: "The best first-value path is build, connect one real system, dry run, then go live.",
      priority: "high",
      href: "/dashboard/connections",
      cta: "Open connections",
    });
  }
  if (failedToday > 0) {
    recommendations.push({
      id: "review-failures",
      title: "Review the workflows failing today",
      reason: "Trust comes from explaining why a run failed and tightening retries or approval rules.",
      priority: "high",
      href: "/dashboard/reports",
      cta: "Open reports",
    });
  }
  if (waitingApprovals >= 3) {
    recommendations.push({
      id: "simplify-approvals",
      title: "Lower approval burden",
      reason: "Frequent approvals often mean a threshold or policy should be turned into a reusable rule.",
      priority: "medium",
      href: "/dashboard/approvals",
      cta: "Review approvals",
    });
  }
  if (activeSystems < 2) {
    recommendations.push({
      id: "build-next-system",
      title: "Build the next operational system",
      reason: "Dobly becomes more valuable when the workspace covers one more core business loop, not just a single task.",
      priority: "medium",
      href: "/dashboard/generate",
      cta: "Build",
    });
  }

  return {
    workspaceLabel: businessProfile?.business_name ?? profile?.full_name ?? "Dobly workspace",
    corePromise: "Your business runs. You direct it.",
    operatingModel:
      "Dobly turns owner intent into persistent business execution through desks, standards, memory, signals, and carefully staged autonomy.",
    focusWedge: wedge,
    focusReason: reason,
    businessMemory,
    policySummary,
    metrics: {
      activeSystems,
      ranToday,
      failedToday,
      waitingApprovals,
      reconnectNeeded,
      changedRecently,
      timeSavedHours,
    },
    whatNeedsAttention,
    recommendations: recommendations.slice(0, 5),
  } satisfies DoblyWorkspaceSnapshot;
}

export function buildDoblyGenerationBrief(params: {
  prompt: string;
  operatorModel: "automation" | "agent" | "pipeline" | "hybrid" | "report";
  classificationReason: string;
  businessProfile: BusinessProfile | null;
  workflows: Workflow[];
  connections: Connection[];
  notificationPreference?: string | null;
  clarifications?: {
    responsibility?: string;
    watch?: string;
    access?: string;
    approvals?: string;
    updates?: string;
  };
}) {
  const {
    prompt,
    operatorModel,
    classificationReason,
    businessProfile,
    workflows,
    connections,
    notificationPreference,
    clarifications,
  } = params;

  const workspaceMemory = buildMemory({
    businessProfile,
    workflows,
    connections,
    notificationPreference,
  });
  const policySummary = buildPolicies(businessProfile, notificationPreference, []);

  let confidence = 56;
  if (businessProfile?.context_summary || businessProfile?.description) confidence += 12;
  if ((businessProfile?.policies?.length ?? 0) > 0) confidence += 10;
  if ((clarifications?.responsibility?.trim()?.length ?? 0) > 8) confidence += 7;
  if ((clarifications?.watch?.trim()?.length ?? 0) > 8) confidence += 5;
  if ((clarifications?.access?.trim()?.length ?? 0) > 8) confidence += 4;
  if ((clarifications?.approvals?.trim()?.length ?? 0) > 8) confidence += 5;
  if ((clarifications?.updates?.trim()?.length ?? 0) > 8) confidence += 5;
  if (connections.length > 0) confidence += 3;
  confidence = Math.max(35, Math.min(96, confidence));

  const confidenceLabel =
    confidence >= 82 ? "high" : confidence >= 66 ? "medium" : "needs_review";

  const triggerStrategy =
    clarifications?.watch?.trim() ||
    (operatorModel === "report"
      ? "Use a schedule-first trigger with manual rerun support."
      : operatorModel === "pipeline"
        ? "Use a request or schedule trigger that starts a multi-step pipeline and passes each step output into the next step."
      : operatorModel === "agent"
        ? "Use inbound conversations or requests as the trigger, then let the operator decide when to act."
        : "Use an event or schedule trigger, but keep new patterns supervised until they are proven safe.");

  const approvalPolicy =
    clarifications?.approvals?.trim() ||
    (operatorModel === "automation"
      ? "Auto-run only clearly low-risk, proven steps; pause for billing, refunds, discounts, external messages, or unproven patterns."
      : "Let the operator work inside guardrails and require approval for sensitive actions or low-confidence moments.");

  const retryPolicy =
    clarifications?.updates?.trim()
      ? "Retry transient failures twice, then escalate with the exact failure reason and report the outcome clearly."
      : "Retry delivery or network failures twice with backoff, then escalate clearly.";

  const firstConnection =
    connections[0]?.provider
      ? humanizeProvider(connections[0].provider)
      : operatorModel === "agent"
        ? "Google Workspace or WhatsApp"
      : operatorModel === "report"
        ? "Google Sheets or Supabase"
        : operatorModel === "pipeline"
          ? "Google Workspace, GitHub, Figma, or a Claude MCP-capable tool"
          : "Google Workspace or Stripe";

  const assumptions = [
    `Dobly should treat this as a ${operatorModel}.`,
    businessProfile?.brand_voice
      ? `Use the saved workspace tone: ${businessProfile.brand_voice}.`
      : "Use a calm, professional default tone until the workspace voice is tightened.",
    businessProfile?.opening_hours
      ? `Prefer actions during ${businessProfile.opening_hours}.`
      : "Assume customer-facing actions should avoid risky after-hours sends unless the user says otherwise.",
  ];

  const approvalPoints = [
    approvalPolicy,
    notificationPreference
      ? `Route high-risk approvals to ${notificationPreference} first.`
      : "Route approvals in-app by default.",
  ];

  const failureModes = [
    "Missing or incomplete trigger data should branch into review instead of forcing a blind send.",
    "Delivery and API failures should retry first, then log the exact failing step and reason.",
    operatorModel === "agent"
      ? "Low-confidence replies should escalate instead of pretending certainty."
      : "Out-of-policy actions should pause for approval instead of continuing silently.",
  ];

  return {
    workspaceMemory,
    policySummary,
    confidence,
    confidenceLabel,
    confidenceReason:
      confidenceLabel === "high"
        ? "Dobly has enough context from your workspace memory and clarifications to generate a strong first draft."
        : confidenceLabel === "medium"
          ? "The draft should be solid, but it still depends on reviewing trigger assumptions and approval boundaries."
          : "Dobly can build this, but the workspace needs more memory or clearer guardrails before it should go live.",
    assumptions,
    approvalPoints,
    failureModes,
    whatThisIs:
      operatorModel === "report"
        ? "A reporting system that gathers data, summarizes it, and delivers a structured output on schedule or on demand."
        : operatorModel === "pipeline"
          ? "A persistent pipeline that breaks the job into steps, passes context between them, and can call specialist tools when the work requires real software operation."
        : operatorModel === "agent"
          ? "A bounded AI operator designed for judgment, conversation, and safe escalation."
          : operatorModel === "hybrid"
            ? "A hybrid operational system that mixes reasoning with repeatable execution steps."
            : "A structured automation that turns a business trigger into dependable follow-through.",
    whyBuiltThisWay: classificationReason,
    whatHappensNext: [
      "Review the draft and confirm the responsibility, access needs, and approval guardrails.",
      "Unlock the first live account only if the job truly needs it.",
      "Run a dry test, then supervised live runs before any repeated pattern is proposed as a deterministic rule.",
      "Approve rule promotion only after Dobly shows evidence: enough successful repeats, no recent corrections, low risk, and clear rollback.",
    ],
    defaults: {
      operatorType: operatorModel,
      triggerStrategy,
      approvalPolicy,
      retryPolicy,
      firstConnection,
    },
  } satisfies DoblyGenerationBrief;
}
