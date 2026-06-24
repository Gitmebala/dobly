import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { isOfficeSchemaMissingError, recordOfficeEvent } from "@/lib/office/events";
import { loadDepartmentOperatingData, type DepartmentOperatingRecord } from "@/lib/department-records";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { OfficeDepartmentId } from "@/lib/office/types";

export interface GeneralManagerBriefing {
  businessStatus: string;
  priority: string;
  commandCenter: {
    operatingMode: "observe" | "protect_trust" | "protect_cash" | "capture_revenue" | "stabilize_operations" | "scale_carefully";
    ownerFocus: string;
    safeMoves: string[];
    approvalRequired: string[];
    ruleCandidates: string[];
    memoryToCapture: string[];
  };
  decisions: string[];
  risks: string[];
  opportunities: string[];
  departmentNotes: string[];
  operatingMetrics: Array<{
    label: string;
    value: string;
    interpretation: string;
  }>;
  recordPriorities: Array<{
    department: string;
    title: string;
    status: string;
    priority: string;
    nextAction: string;
  }>;
  nextMoves: string[];
  recentOutcomes: string[];
  setupWarning?: string;
}

export interface BoardroomReport {
  period: string;
  strategicQuestion: string;
  members: Array<{
    agentName: string;
    role: string;
    mandate: string;
    finding: string;
    recommendation: string;
    confidence: "low" | "medium" | "high";
    evidence?: string[];
    pressureScore?: number;
  }>;
  synthesis: string;
  ownerDecisions: string[];
  strategicMetrics: Array<{
    label: string;
    value: string;
    interpretation: string;
  }>;
  strategicRisks: string[];
  strategicOpportunities: string[];
  operatingPressure: Array<{
    department: string;
    records: number;
    needsAction: number;
    highPriority: number;
    moneyLinked: number;
    pressureScore: number;
    topItem: string | null;
  }>;
  operatingThesis: string;
  setupWarning?: string;
}

export async function createGeneralManagerBriefing(params: {
  userId: string;
  workspaceId?: string | null;
}): Promise<GeneralManagerBriefing> {
  const office = await buildHomebaseDataWithFallback(params);
  const attention = office.snapshot.whatNeedsAttention;
  const departments = office.departments as Array<{
    id: string;
    name: string;
    status: string;
    latestEvent: string | null;
    activeWorkers: number;
    openTasks: number;
  }>;
  const activeRooms = departments.filter((department) => department.status !== "quiet");
  const pressuredRooms = departments.filter((department) => department.status === "needs_attention");
  const officeTasks = office.tasks as Array<{ status: string; title: string }>;
  const queuedDecisions = officeTasks.filter((task) => task.status === "waiting_approval");
  const operatingContext = await buildGeneralManagerOperatingContext(params.userId);
  const topRecord = operatingContext.recordPriorities[0];

  const briefing: GeneralManagerBriefing = {
    businessStatus: buildManagerStatus(office.snapshot.businessStatus, operatingContext),
    priority:
      attention[0] ??
      (topRecord ? `${topRecord.department}: ${topRecord.title} needs ${topRecord.nextAction.toLowerCase()}` : null) ??
      pressuredRooms[0]?.latestEvent ??
      "No urgent owner intervention is required right now.",
    commandCenter: buildGeneralManagerCommandCenter(operatingContext),
    decisions: [
      ...queuedDecisions.slice(0, 5).map((task) => task.title),
      ...operatingContext.recordPriorities
        .filter((record) => record.priority === "high" || record.priority === "critical")
        .slice(0, 3)
        .map((record) => `${record.department}: ${record.nextAction}`),
    ].slice(0, 8),
    risks: [
      ...operatingContext.risks,
      ...office.snapshot.risks.slice(0, 5).map((risk: any) => String(risk.title ?? risk.reason ?? risk.type ?? "Risk")),
    ].slice(0, 8),
    opportunities: [
      ...operatingContext.opportunities,
      ...office.snapshot.opportunities
      .slice(0, 5)
      .map((opportunity: any) => String(opportunity.title ?? opportunity.reason ?? opportunity.type ?? "Opportunity")),
    ].slice(0, 8),
    departmentNotes: activeRooms.slice(0, 8).map((room) => {
      const pressure = room.status === "needs_attention" ? "needs attention" : "is active";
      const operating = operatingContext.departmentSummaries.find((summary) => summary.departmentId === room.id);
      return `${room.name} ${pressure}: ${operating?.summary ?? room.latestEvent ?? `${room.activeWorkers} workers, ${room.openTasks} open tasks`}.`;
    }),
    operatingMetrics: operatingContext.metrics,
    recordPriorities: operatingContext.recordPriorities,
    nextMoves: operatingContext.nextMoves,
    recentOutcomes: operatingContext.recentOutcomes,
  };

  await safeRecordIntelligenceEvent({
    workspaceId: params.workspaceId ?? null,
    userId: params.userId,
    departmentId: "general_manager",
    workerKind: "agent",
    eventType: "briefing.created",
    source: "office.general_manager",
    entityType: "general_manager_briefing",
    title: briefing.businessStatus,
    summary: briefing.priority,
    payload: briefing as unknown as Record<string, unknown>,
    riskLevel: queuedDecisions.length > 0 || pressuredRooms.length > 0 ? "medium" : "low",
  }, briefing);

  return briefing;
}

function buildGeneralManagerCommandCenter(
  context: Awaited<ReturnType<typeof buildGeneralManagerOperatingContext>>,
): GeneralManagerBriefing["commandCenter"] {
  const approvalRequired = context.recordPriorities
    .filter((record) => record.priority === "high" || record.priority === "critical")
    .slice(0, 5)
    .map((record) => `${record.department}: ${record.nextAction}`);
  const safeMoves = context.nextMoves
    .filter((move) => !/refund|payment|legal|discount|complaint|cash|finance/i.test(move))
    .slice(0, 4);
  const ruleCandidates = context.recentOutcomes.length > 0
    ? [
        "Review recent completed actions for repeated owner-approved patterns.",
        "Only promote low-risk, reversible patterns after explicit owner approval.",
      ]
    : ["No rule candidates yet. Dobly needs more supervised outcomes first."];
  const memoryToCapture = context.recordPriorities
    .slice(0, 4)
    .map((record) => `${record.department}: remember handling preference for ${record.title}.`);

  return {
    operatingMode: chooseOperatingMode(context),
    ownerFocus: approvalRequired[0] ?? context.nextMoves[0] ?? "Connect one live channel so Dobly can build operating memory.",
    safeMoves: safeMoves.length > 0 ? safeMoves : ["Create one low-risk simulation run and inspect the operation feed."],
    approvalRequired,
    ruleCandidates,
    memoryToCapture,
  };
}

function chooseOperatingMode(
  context: Awaited<ReturnType<typeof buildGeneralManagerOperatingContext>>,
): GeneralManagerBriefing["commandCenter"]["operatingMode"] {
  const priorityText = context.recordPriorities.map((record) => `${record.department} ${record.title} ${record.nextAction}`).join(" ").toLowerCase();
  if (context.totalRecords === 0) return "observe";
  if (/support|customer|complaint|trust|angry/.test(priorityText)) return "protect_trust";
  if (/finance|invoice|cash|payment|collection|mpesa|m-pesa/.test(priorityText)) return "protect_cash";
  if (/sales|lead|revenue|follow/.test(priorityText)) return "capture_revenue";
  if (/operations|blocked|delivery|supplier/.test(priorityText)) return "stabilize_operations";
  return "scale_carefully";
}

const GM_DEPARTMENTS: OfficeDepartmentId[] = [
  "reception",
  "sales",
  "support",
  "finance",
  "operations",
  "marketing",
  "creative",
  "engineering",
];

async function buildGeneralManagerOperatingContext(userId: string) {
  const departmentData = await Promise.all(
    GM_DEPARTMENTS.map(async (departmentId) => ({
      departmentId,
      operating: await loadDepartmentOperatingData({ userId, departmentId }),
    })),
  );
  const records = departmentData.flatMap(({ departmentId, operating }) =>
    operating.records.map((record) => ({
      ...record,
      departmentId,
      departmentName: labelDepartment(departmentId),
    })),
  );
  const urgentRecords = records
    .filter((record) => record.priority === "high" || record.priority === "critical" || needsAction(record.status))
    .sort((a, b) => urgencyRank(b) - urgencyRank(a))
    .slice(0, 10);
  const recentOutcomes = await loadRecentTaskOutcomes(userId);
  const openRecords = records.filter((record) => needsAction(record.status));
  const highRecords = records.filter((record) => record.priority === "high" || record.priority === "critical");

  return {
    totalRecords: records.length,
    openRecords: openRecords.length,
    highRecords: highRecords.length,
    metrics: [
      {
        label: "Operating records",
        value: String(records.length),
        interpretation: "Durable business objects currently visible to Homebase.",
      },
      {
        label: "Records needing movement",
        value: String(openRecords.length),
        interpretation: "Items whose status suggests Dobly or the owner should act.",
      },
      {
        label: "High-priority records",
        value: String(highRecords.length),
        interpretation: "Sensitive, blocked, valuable, overdue, or risky work.",
      },
      {
        label: "Recent task outcomes",
        value: String(recentOutcomes.length),
        interpretation: "Completed or failed worker actions that updated source records.",
      },
    ],
    recordPriorities: urgentRecords.map((record) => ({
      department: record.departmentName,
      title: record.title,
      status: record.status,
      priority: record.priority,
      nextAction: record.nextAction ?? nextActionForRecord(record),
    })),
    departmentSummaries: departmentData.map(({ departmentId, operating }) => ({
      departmentId,
      summary: summarizeDepartmentRecords(departmentId, operating.records),
    })),
    risks: buildRecordRisks(records),
    opportunities: buildRecordOpportunities(records),
    nextMoves: buildNextMoves(records, recentOutcomes),
    recentOutcomes,
  };
}

async function loadRecentTaskOutcomes(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("office_tasks")
    .select("title,status,result,updated_at")
    .eq("user_id", userId)
    .in("status", ["completed", "failed"])
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) return [];
  return (data ?? [])
    .filter((task: any) => task.result?.sourceRecordOutcome)
    .map((task: any) => {
      const outcome = task.result?.sourceRecordOutcome;
      if (outcome?.error) return `${task.title}: record update failed - ${outcome.error}`;
      const source = outcome?.sourceRecord;
      return `${task.title}: updated ${String(source?.kind ?? "record").replaceAll("_", " ")}.`;
    });
}

function labelDepartment(id: OfficeDepartmentId) {
  return id.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function needsAction(status: string) {
  return /open|new|needs_review|waiting|queued|overdue|blocked|failed/i.test(status);
}

function urgencyRank(record: DepartmentOperatingRecord & { departmentId: OfficeDepartmentId }) {
  const priority = record.priority === "critical" ? 40 : record.priority === "high" ? 30 : record.priority === "medium" ? 20 : 10;
  const status = /blocked|overdue|failed/i.test(record.status)
    ? 10
    : /waiting|needs_review/i.test(record.status)
      ? 7
      : /open|new|queued/i.test(record.status)
        ? 4
        : 0;
  const money = record.moneyLabel ? 3 : 0;
  return priority + status + money;
}

function summarizeDepartmentRecords(departmentId: OfficeDepartmentId, records: DepartmentOperatingRecord[]) {
  if (records.length === 0) return "No live operating records yet.";
  const open = records.filter((record) => needsAction(record.status)).length;
  const high = records.filter((record) => record.priority === "high" || record.priority === "critical").length;
  const top = records[0];
  return `${records.length} records, ${open} need movement, ${high} high priority. Top item: ${top.title}.`;
}

function nextActionForRecord(record: DepartmentOperatingRecord) {
  if (record.kind === "lead") return "Qualify and follow up before the lead cools.";
  if (record.kind === "support_case") return "Resolve or escalate with care.";
  if (record.kind === "finance_record" || record.kind === "invoice") return "Review cash impact and queue follow-up.";
  if (record.kind === "operations_item") return "Assign owner, dependency, and deadline.";
  if (record.kind === "conversation") return "Reply or route the conversation.";
  if (record.kind === "content_item") return "Review, approve, or schedule content.";
  return "Review the record.";
}

function buildRecordRisks(records: Array<DepartmentOperatingRecord & { departmentName: string }>) {
  return records
    .filter((record) => record.priority === "high" || record.priority === "critical" || /blocked|overdue|failed/i.test(record.status))
    .slice(0, 6)
    .map((record) => `${record.departmentName}: ${record.title} is ${record.status}; ${record.nextAction ?? nextActionForRecord(record)}`);
}

function buildRecordOpportunities(records: Array<DepartmentOperatingRecord & { departmentName: string }>) {
  return records
    .filter((record) => record.kind === "lead" || record.kind === "content_item" || record.moneyLabel)
    .slice(0, 6)
    .map((record) => `${record.departmentName}: ${record.title}${record.moneyLabel ? ` (${record.moneyLabel})` : ""}`);
}

function buildNextMoves(
  records: Array<DepartmentOperatingRecord & { departmentName: string }>,
  recentOutcomes: string[],
) {
  const moves: string[] = [];
  const lead = records.find((record) => record.kind === "lead" && needsAction(record.status));
  const finance = records.find((record) => (record.kind === "finance_record" || record.kind === "invoice") && needsAction(record.status));
  const support = records.find((record) => record.kind === "support_case" && needsAction(record.status));
  const ops = records.find((record) => record.kind === "operations_item" && needsAction(record.status));

  if (finance) moves.push(`Finance first: ${finance.nextAction ?? nextActionForRecord(finance)} (${finance.title}).`);
  if (support) moves.push(`Protect trust: ${support.nextAction ?? nextActionForRecord(support)} (${support.title}).`);
  if (lead) moves.push(`Capture demand: ${lead.nextAction ?? nextActionForRecord(lead)} (${lead.title}).`);
  if (ops) moves.push(`Unblock delivery: ${ops.nextAction ?? nextActionForRecord(ops)} (${ops.title}).`);
  if (recentOutcomes.length > 0) moves.push("Review recent task outcomes and graduate reliable actions toward guarded autonomy.");
  if (moves.length === 0) moves.push("Create or connect one live channel so Dobly can build operating history.");

  return moves.slice(0, 5);
}

function buildManagerStatus(status: string, context: Awaited<ReturnType<typeof buildGeneralManagerOperatingContext>>) {
  if (context.highRecords > 0) {
    return `${status}. ${context.highRecords} high-priority operating record${context.highRecords === 1 ? "" : "s"} need attention.`;
  }
  if (context.openRecords > 0) {
    return `${status}. ${context.openRecords} operating record${context.openRecords === 1 ? "" : "s"} need movement.`;
  }
  if (context.totalRecords > 0) {
    return `${status}. Operating records are present and no major record pressure is visible.`;
  }
  return `${status}. Homebase is structurally ready but needs live records from connected channels.`;
}

export async function createBoardroomReport(params: {
  userId: string;
  workspaceId?: string | null;
  strategicQuestion?: string | null;
}): Promise<BoardroomReport> {
  const office = await buildHomebaseDataWithFallback(params);
  const board = await buildBoardroomOperatingContext(params.userId);
  const question =
    params.strategicQuestion?.trim() ||
    "Is this business healthy, where is pressure building, and what should the owner change next?";

  const ownerDecisions = [
    ...(office.tasks as Array<{ status: string; title: string }>)
      .filter((task) => task.status === "waiting_approval")
      .slice(0, 5)
      .map((task) => task.title),
    ...board.decisions,
  ].slice(0, 8);

  const report: BoardroomReport = {
    period: "current operating-record window",
    strategicQuestion: question,
    members: board.members,
    synthesis: synthesizeStrategicBoardView(office.snapshot.businessStatus, board),
    ownerDecisions,
    strategicMetrics: board.metrics,
    strategicRisks: board.risks,
    strategicOpportunities: board.opportunities,
    operatingPressure: board.operatingPressure,
    operatingThesis: board.operatingThesis,
  };

  await safeRecordIntelligenceEvent({
    workspaceId: params.workspaceId ?? null,
    userId: params.userId,
    departmentId: "boardroom",
    workerKind: "agent",
    eventType: "briefing.created",
    source: "office.boardroom",
    entityType: "boardroom_report",
    title: "Boardroom report created",
    summary: report.synthesis,
    payload: report as unknown as Record<string, unknown>,
    riskLevel: report.ownerDecisions.length > 0 || report.strategicRisks.length > 0 ? "medium" : "low",
  }, report);

  return report;
}

async function buildBoardroomOperatingContext(userId: string) {
  const [finance, sales, marketing, operations, support, reception] = await Promise.all([
    loadDepartmentOperatingData({ userId, departmentId: "finance" }),
    loadDepartmentOperatingData({ userId, departmentId: "sales" }),
    loadDepartmentOperatingData({ userId, departmentId: "marketing" }),
    loadDepartmentOperatingData({ userId, departmentId: "operations" }),
    loadDepartmentOperatingData({ userId, departmentId: "support" }),
    loadDepartmentOperatingData({ userId, departmentId: "reception" }),
  ]);
  const recentOutcomes = await loadRecentTaskOutcomes(userId);

  const financeRecords = finance.records.filter((record) => record.kind === "finance_record" || record.kind === "invoice");
  const leads = sales.records.filter((record) => record.kind === "lead");
  const content = marketing.records.filter((record) => record.kind === "content_item");
  const ops = operations.records.filter((record) => record.kind === "operations_item");
  const supportCases = support.records.filter((record) => record.kind === "support_case");
  const conversations = reception.records.filter((record) => record.kind === "conversation");
  const allRecords = [
    ...finance.records,
    ...sales.records,
    ...marketing.records,
    ...operations.records,
    ...support.records,
    ...reception.records,
  ];

  const members = [
    buildCfoMember(financeRecords),
    buildCroMember(leads),
    buildCmoMember(content, leads, supportCases),
    buildCooMember(ops),
    buildCcoMember(supportCases, conversations),
    buildCsoMember(allRecords, recentOutcomes),
  ];
  const risks = buildStrategicRisks({ financeRecords, leads, ops, supportCases, conversations });
  const opportunities = buildStrategicOpportunities({ leads, content, financeRecords, supportCases });
  const decisions = buildStrategicDecisions({ financeRecords, leads, ops, supportCases, content });
  const operatingPressure = buildOperatingPressure([
    ["Finance", finance.records],
    ["Revenue", sales.records],
    ["Marketing", marketing.records],
    ["Operations", operations.records],
    ["Customer", support.records],
    ["Reception", reception.records],
  ]);

  return {
    members,
    metrics: [
      {
        label: "Cash pressure",
        value: String(countNeedsAction(financeRecords)),
        interpretation: "Finance records or invoices needing review, follow-up, or reconciliation.",
      },
      {
        label: "Revenue motion",
        value: String(countNeedsAction(leads)),
        interpretation: "Lead records still requiring qualification, follow-up, or owner attention.",
      },
      {
        label: "Customer trust pressure",
        value: String(countNeedsAction(supportCases) + countNeedsAction(conversations)),
        interpretation: "Support cases and conversations that could affect customer experience.",
      },
      {
        label: "Operational drag",
        value: String(countNeedsAction(ops)),
        interpretation: "Operations items that are open, blocked, or waiting for movement.",
      },
      {
        label: "Recent execution learning",
        value: String(recentOutcomes.length),
        interpretation: "Completed worker actions that updated source records and can guide autonomy.",
      },
    ],
    risks,
    opportunities,
    decisions,
    operatingPressure,
    operatingThesis: buildOperatingThesis({ financeRecords, leads, ops, supportCases, content, recentOutcomes }),
  };
}

function buildCfoMember(records: DepartmentOperatingRecord[]): BoardroomReport["members"][number] {
  const totalMoney = sumMoney(records);
  const open = countNeedsAction(records);
  const overdue = records.filter((record) => /overdue|needs_review|queued_followup/i.test(record.status));
  return {
    agentName: "Amina",
    role: "Chief Financial Officer",
    mandate: "Cash clarity, collections, reconciliation, and spend discipline.",
    finding:
      records.length === 0
        ? "Finance has no record-backed cash picture yet."
        : `Finance has ${records.length} cash records, ${open} needing movement${totalMoney ? `, with ${totalMoney} visible in tagged amounts` : ""}.`,
    recommendation:
      overdue.length > 0
        ? "Resolve cash ambiguity before increasing spend: reconcile payment notices, chase overdue invoices, and keep follow-ups approval-gated."
        : "Keep finance instrumentation connected and use cash follow-up speed as the finance operating metric.",
    confidence: confidenceFromRecords(records),
    evidence: evidence(records, 3),
    pressureScore: pressureScore(records),
  };
}

function buildCroMember(records: DepartmentOperatingRecord[]): BoardroomReport["members"][number] {
  const open = countNeedsAction(records);
  const valuable = records.filter((record) => record.moneyLabel || record.priority === "high");
  return {
    agentName: "Kito",
    role: "Chief Revenue Officer",
    mandate: "Pipeline velocity, lead quality, conversion discipline, and revenue experiments.",
    finding:
      records.length === 0
        ? "Sales has no record-backed pipeline yet."
        : `Sales has ${records.length} lead records, ${open} needing movement, and ${valuable.length} potentially valuable or high-priority opportunities.`,
    recommendation:
      open > 0
        ? "Prioritize speed-to-lead: create actions for hot leads, qualify fit, and measure follow-up completion before adding more acquisition."
        : "Define the next revenue experiment only after lead source, qualification, and follow-up outcomes are being captured consistently.",
    confidence: confidenceFromRecords(records),
    evidence: evidence(records, 3),
    pressureScore: pressureScore(records),
  };
}

function buildCmoMember(content: DepartmentOperatingRecord[], leads: DepartmentOperatingRecord[], support: DepartmentOperatingRecord[]): BoardroomReport["members"][number] {
  const contentNeedsReview = content.filter((record) => /draft|needs_review/i.test(record.status)).length;
  const marketInputs = leads.length + support.length;
  const records = [...content, ...leads, ...support];
  return {
    agentName: "Nia",
    role: "Chief Marketing Officer",
    mandate: "Market narrative, content cadence, customer language, and demand creation.",
    finding:
      content.length === 0
        ? `Marketing has no content operating record yet, but ${marketInputs} sales/support records can become market insight.`
        : `Marketing has ${content.length} content records, ${contentNeedsReview} needing review, with ${marketInputs} customer-facing records available as input.`,
    recommendation:
      marketInputs > 0
        ? "Build content from live objections, support questions, and lead intent instead of generic posting. Turn recurring customer language into campaigns."
        : "Connect one demand channel and create a small content loop: idea, draft, approve, publish, learn.",
    confidence: content.length > 0 || marketInputs > 0 ? "medium" : "low",
    evidence: evidence(records, 3),
    pressureScore: pressureScore(records),
  };
}

function buildCooMember(records: DepartmentOperatingRecord[]): BoardroomReport["members"][number] {
  const blocked = records.filter((record) => /blocked|open|in_progress/i.test(record.status));
  return {
    agentName: "Otieno",
    role: "Chief Operations Officer",
    mandate: "Delivery reliability, supplier handoffs, blockers, and operational throughput.",
    finding:
      records.length === 0
        ? "Operations has no record-backed delivery or supplier pressure yet."
        : `Operations has ${records.length} work items and ${blocked.length} still moving or blocked.`,
    recommendation:
      blocked.length > 0
        ? "Assign owner, dependency, and deadline to each blocker before pushing more work into the system."
        : "Keep operations quiet by instrumenting order, supplier, and fulfillment handoffs before volume increases.",
    confidence: confidenceFromRecords(records),
    evidence: evidence(records, 3),
    pressureScore: pressureScore(records),
  };
}

function buildCcoMember(cases: DepartmentOperatingRecord[], conversations: DepartmentOperatingRecord[]): BoardroomReport["members"][number] {
  const records = [...cases, ...conversations];
  const trustPressure = records.filter((record) => needsAction(record.status) || record.priority === "high" || record.priority === "critical");
  return {
    agentName: "Maya",
    role: "Chief Customer Officer",
    mandate: "Customer trust, support quality, retention signals, and recovery paths.",
    finding:
      cases.length + conversations.length === 0
        ? "Customer trust signals are not deep enough yet because support cases and conversations are sparse."
        : `Customer experience has ${cases.length} support cases and ${conversations.length} conversations, with ${trustPressure.length} needing care.`,
    recommendation:
      trustPressure.length > 0
        ? "Protect trust before automation speed: keep sensitive replies approval-gated and convert recurring issues into Training Room rules."
        : "Use quiet support periods to improve knowledge base coverage and response standards.",
    confidence: confidenceFromRecords(records),
    evidence: evidence(records, 3),
    pressureScore: pressureScore(records),
  };
}

function buildCsoMember(records: DepartmentOperatingRecord[], recentOutcomes: string[]): BoardroomReport["members"][number] {
  const active = records.filter((record) => needsAction(record.status));
  const high = records.filter((record) => record.priority === "high" || record.priority === "critical");
  return {
    agentName: "Sage",
    role: "Chief Strategy Officer",
    mandate: "Cross-department tradeoffs, sequencing, and what the owner should change next.",
    finding:
      records.length === 0
        ? "The business operating picture is not instrumented enough for confident strategy."
        : `Across the office, ${records.length} records exist, ${active.length} need movement, ${high.length} are high priority, and ${recentOutcomes.length} recent task outcomes created learning.`,
    recommendation:
      high.length > 0
        ? "Do not scale surface area yet. Clear high-priority pressure, then graduate the most reliable repeat actions into guarded autonomy."
        : "Deepen the most active wedge before adding departments: one connected channel, one revenue loop, one trust loop, one cash loop.",
    confidence: records.length > 8 ? "high" : records.length > 0 ? "medium" : "low",
    evidence: [...evidence(records, 2), ...recentOutcomes.slice(0, 2)],
    pressureScore: pressureScore(records),
  };
}

function countNeedsAction(records: DepartmentOperatingRecord[]) {
  return records.filter((record) => needsAction(record.status)).length;
}

function confidenceFromRecords(records: DepartmentOperatingRecord[]): "low" | "medium" | "high" {
  if (records.length >= 8) return "high";
  if (records.length > 0) return "medium";
  return "low";
}

function evidence(records: DepartmentOperatingRecord[], limit: number) {
  return records
    .filter((record) => needsAction(record.status) || record.priority === "high" || record.priority === "critical" || record.moneyLabel)
    .slice(0, limit)
    .map((record) => `${record.title} - ${record.status}${record.moneyLabel ? ` - ${record.moneyLabel}` : ""}`);
}

function pressureScore(records: DepartmentOperatingRecord[]) {
  return records.reduce((score, record) => {
    const priority = record.priority === "critical" ? 8 : record.priority === "high" ? 5 : record.priority === "medium" ? 2 : 1;
    const status = needsAction(record.status) ? 3 : 0;
    const money = record.moneyLabel ? 2 : 0;
    return score + priority + status + money;
  }, 0);
}

function buildOperatingPressure(departments: Array<[string, DepartmentOperatingRecord[]]>) {
  return departments
    .map(([department, records]) => {
      const sorted = [...records].sort((a, b) => pressureScore([b]) - pressureScore([a]));
      return {
        department,
        records: records.length,
        needsAction: countNeedsAction(records),
        highPriority: records.filter((record) => record.priority === "high" || record.priority === "critical").length,
        moneyLinked: records.filter((record) => Boolean(record.moneyLabel)).length,
        pressureScore: pressureScore(records),
        topItem: sorted[0]?.title ?? null,
      };
    })
    .sort((a, b) => b.pressureScore - a.pressureScore);
}

function sumMoney(records: DepartmentOperatingRecord[]) {
  const values = records
    .map((record) => {
      const match = record.moneyLabel?.match(/([A-Z]{3})\s([\d,]+)/);
      if (!match) return null;
      return { currency: match[1], amount: Number(match[2].replace(/,/g, "")) };
    })
    .filter(Boolean) as Array<{ currency: string; amount: number }>;
  if (values.length === 0) return null;
  const grouped = new Map<string, number>();
  for (const value of values) grouped.set(value.currency, (grouped.get(value.currency) ?? 0) + value.amount);
  return Array.from(grouped.entries())
    .map(([currency, amount]) => `${currency} ${amount.toLocaleString()}`)
    .join(", ");
}

function buildStrategicRisks(params: {
  financeRecords: DepartmentOperatingRecord[];
  leads: DepartmentOperatingRecord[];
  ops: DepartmentOperatingRecord[];
  supportCases: DepartmentOperatingRecord[];
  conversations: DepartmentOperatingRecord[];
}) {
  const risks: string[] = [];
  if (countNeedsAction(params.financeRecords) > 0) risks.push("Cash risk: finance records or invoices need review before spend/growth decisions.");
  if (countNeedsAction(params.leads) > 3) risks.push("Revenue leakage: multiple leads need movement and may cool without fast follow-up.");
  if (params.supportCases.some((record) => record.priority === "high" || record.priority === "critical")) risks.push("Trust risk: sensitive support cases need careful owner-reviewed handling.");
  if (params.ops.some((record) => /blocked/i.test(record.status))) risks.push("Delivery risk: blocked operations records can damage customer experience.");
  if (params.conversations.some((record) => /waiting_owner/i.test(record.status))) risks.push("Response risk: conversations are waiting on owner decisions.");
  return risks.slice(0, 6);
}

function buildStrategicOpportunities(params: {
  leads: DepartmentOperatingRecord[];
  content: DepartmentOperatingRecord[];
  financeRecords: DepartmentOperatingRecord[];
  supportCases: DepartmentOperatingRecord[];
}) {
  const opportunities: string[] = [];
  const valuableLeads = params.leads.filter((record) => record.moneyLabel || record.priority === "high");
  if (valuableLeads.length > 0) opportunities.push(`Revenue opportunity: ${valuableLeads.length} lead${valuableLeads.length === 1 ? "" : "s"} look valuable or urgent.`);
  if (params.content.length > 0) opportunities.push("Marketing opportunity: content records can be pushed through approval and performance learning.");
  if (params.supportCases.length > 0) opportunities.push("Content opportunity: support questions can become FAQs, training rules, and trust-building content.");
  if (params.financeRecords.some((record) => record.moneyLabel)) opportunities.push("Cash opportunity: tagged finance amounts can become a recovery/follow-up scoreboard.");
  return opportunities.slice(0, 6);
}

function buildStrategicDecisions(params: {
  financeRecords: DepartmentOperatingRecord[];
  leads: DepartmentOperatingRecord[];
  ops: DepartmentOperatingRecord[];
  supportCases: DepartmentOperatingRecord[];
  content: DepartmentOperatingRecord[];
}) {
  const decisions: string[] = [];
  const finance = params.financeRecords.find((record) => needsAction(record.status));
  const lead = params.leads.find((record) => needsAction(record.status));
  const support = params.supportCases.find((record) => needsAction(record.status));
  const ops = params.ops.find((record) => needsAction(record.status));
  const content = params.content.find((record) => needsAction(record.status));
  if (finance) decisions.push(`Finance: approve or revise the next cash action for ${finance.title}.`);
  if (support) decisions.push(`Customer: decide handling for ${support.title}.`);
  if (lead) decisions.push(`Revenue: decide follow-up priority for ${lead.title}.`);
  if (ops) decisions.push(`Operations: assign owner/deadline for ${ops.title}.`);
  if (content) decisions.push(`Marketing: approve, revise, or archive ${content.title}.`);
  return decisions.slice(0, 6);
}

function buildOperatingThesis(params: {
  financeRecords: DepartmentOperatingRecord[];
  leads: DepartmentOperatingRecord[];
  ops: DepartmentOperatingRecord[];
  supportCases: DepartmentOperatingRecord[];
  content: DepartmentOperatingRecord[];
  recentOutcomes: string[];
}) {
  const cashPressure = countNeedsAction(params.financeRecords);
  const revenuePressure = countNeedsAction(params.leads);
  const trustPressure = countNeedsAction(params.supportCases);
  const opsPressure = countNeedsAction(params.ops);
  const contentPressure = countNeedsAction(params.content);
  const maxPressure = Math.max(cashPressure, revenuePressure, trustPressure, opsPressure, contentPressure);

  if (maxPressure === 0 && params.recentOutcomes.length === 0) {
    return "The strategic priority is instrumentation: connect channels and generate enough operating records for the board to reason with confidence.";
  }
  if (cashPressure === maxPressure && cashPressure > 0) {
    return "The business should protect cash clarity first. Growth should wait until payment, invoice, and reconciliation ambiguity is reduced.";
  }
  if (trustPressure === maxPressure && trustPressure > 0) {
    return "The business should protect trust first. Customer-sensitive issues should stay supervised while support memory improves.";
  }
  if (revenuePressure === maxPressure && revenuePressure > 0) {
    return "The business should focus on revenue conversion. Speed-to-lead and follow-up discipline are the highest-leverage operating improvements.";
  }
  if (opsPressure === maxPressure && opsPressure > 0) {
    return "The business should stabilize delivery before adding demand. Operational blockers need owners, deadlines, and escalation paths.";
  }
  return "The business has enough motion to start graduating reliable repeat actions into guarded autonomy, while keeping money and trust actions supervised.";
}

function synthesizeStrategicBoardView(
  status: string,
  board: Awaited<ReturnType<typeof buildBoardroomOperatingContext>>,
) {
  const strongestRisk = board.risks[0];
  const strongestOpportunity = board.opportunities[0];
  return [
    status,
    board.operatingThesis,
    strongestRisk ? `Primary risk: ${strongestRisk}` : "No dominant strategic risk is visible from current records.",
    strongestOpportunity ? `Primary opportunity: ${strongestOpportunity}` : "The biggest opportunity is to create more live operating data.",
  ].join(" ");
}

async function buildHomebaseDataWithFallback(params: {
  userId: string;
  workspaceId?: string | null;
}) {
  try {
    return await buildHomebaseDashboardData(params);
  } catch (error) {
    if (!isOfficeSchemaMissingError(error)) throw error;

    return {
      snapshot: {
        generatedAt: new Date().toISOString(),
        businessStatus: "Homebase needs setup",
        focusReason:
          "The Homebase office tables are not installed in Supabase yet, so Dobly can preview intelligence but cannot persist office events.",
        departments: [],
        metrics: {
          activeWorkers: 0,
          waitingApprovals: 0,
          openSignals: 0,
          recentEvents: 0,
          integrationsNeedingAttention: 0,
        },
        whatNeedsAttention: [
          "Apply supabase/dobly_operating_system_schema.sql in Supabase SQL editor.",
        ],
        whatHappened: [],
        needsDecision: [],
        opportunities: [],
        risks: [],
      },
      departments: [],
      workers: [],
      tasks: [],
      recentEvents: [],
    };
  }
}

async function safeRecordIntelligenceEvent(
  input: Parameters<typeof recordOfficeEvent>[0],
  output: { setupWarning?: string },
) {
  try {
    await recordOfficeEvent(input);
  } catch (error) {
    if (!isOfficeSchemaMissingError(error)) throw error;
    output.setupWarning =
      "Homebase office tables are missing. Apply supabase/dobly_operating_system_schema.sql in Supabase SQL editor, then refresh the schema cache.";
  }
}

function roomFinding(room: { name: string; status: string; openTasks: number; latestEvent: string | null } | undefined, fallback: string) {
  if (!room) return fallback;
  return `${room.name} is ${room.status.replaceAll("_", " ")} with ${room.openTasks} open tasks. ${room.latestEvent ?? ""}`.trim();
}

function confidenceForRoom(room: { status: string; activeWorkers: number } | undefined): "low" | "medium" | "high" {
  if (!room || room.activeWorkers === 0) return "low";
  if (room.status === "quiet") return "medium";
  return "high";
}

function synthesizeBoardView(status: string, attention: string[]) {
  if (attention.length > 0) {
    return `${status}. The board's immediate recommendation is to clear the top attention item before expanding autonomy: ${attention[0]}`;
  }
  return `${status}. The board's recommendation is to deepen instrumentation and graduate reliable workers from supervised to guarded autonomy.`;
}
