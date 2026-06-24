import { createBoardroomReport, createGeneralManagerBriefing } from "@/lib/office/intelligence";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Briefing, BriefingType } from "@/types";

interface CreateBriefingParams {
  userId: string;
  briefingType: BriefingType;
  periodStart?: string | null;
  periodEnd?: string | null;
  content: BriefingContent;
}

interface GenerateBriefingParams {
  userId: string;
  briefingType: BriefingType;
  workspaceId?: string | null;
}

interface LegacyBriefingRow {
  id: string;
  workspace_id: string;
  briefing_type: "morning" | "daily" | "weekly" | "incident" | "return_from_absence";
  title: string;
  summary: string;
  body: Record<string, unknown> | null;
  generated_at: string;
  acknowledged_at: string | null;
}

type BriefingContent = Pick<
  Briefing,
  | "business_status"
  | "what_happened"
  | "what_matters"
  | "what_changed"
  | "dobly_recommendations"
  | "needs_decision"
  | "opportunities"
  | "risks"
  | "metrics_summary"
>;

function nowIso() {
  return new Date().toISOString();
}

function startOfTodayIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function startOfWeekIso() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function freshnessWindowHours(type: BriefingType) {
  return type === "weekly_summary" ? 24 * 7 : 6;
}

function periodWindow(type: BriefingType) {
  const end = nowIso();
  const start = type === "weekly_summary" ? startOfWeekIso() : startOfTodayIso();
  return { start, end };
}

function toLine(value: unknown, fallback = "Update available.") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      (typeof record.message === "string" && record.message) ||
      (typeof record.title === "string" && record.title) ||
      (typeof record.action === "string" && record.action) ||
      (typeof record.reason === "string" && record.reason) ||
      (typeof record.description === "string" && record.description) ||
      fallback
    );
  }
  return fallback;
}

function asRecordArray(value: unknown, fallbackMessage: string): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : { message: String(item) }));
  }
  if (typeof value === "string" && value.trim()) return [{ message: value.trim() }];
  return [{ message: fallbackMessage }];
}

function briefingColumnMissing(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || message.includes("column briefings.user_id") || message.includes("column briefings.read_at") || message.includes("period_start");
}

function legacyTypeToBriefingType(type: LegacyBriefingRow["briefing_type"]): BriefingType {
  if (type === "weekly") return "weekly_summary";
  if (type === "incident") return "risk_digest";
  return "morning";
}

function appTypeToLegacyType(type: BriefingType): LegacyBriefingRow["briefing_type"] {
  if (type === "weekly_summary") return "weekly";
  if (type === "risk_digest") return "incident";
  return "daily";
}

function briefingTitle(type: BriefingType) {
  const titles: Record<BriefingType, string> = {
    morning: "Morning briefing",
    evening: "Evening close",
    risk_digest: "Risk digest",
    opportunity: "Opportunity briefing",
    weekly_summary: "Weekly board briefing",
  };
  return titles[type];
}

function legacyToBriefing(row: LegacyBriefingRow, userId: string): Briefing {
  const body = row.body ?? {};
  return {
    id: row.id,
    user_id: userId,
    briefing_type: legacyTypeToBriefingType(row.briefing_type),
    business_status: row.summary || row.title || "Dobly has a briefing ready.",
    what_happened: asRecordArray(body.what_happened ?? body.whatHappened, "Recent operating activity is ready to review."),
    what_matters: asRecordArray(body.what_matters ?? body.whatMatters, "Dobly is watching the important parts of the operation."),
    what_changed: asRecordArray(body.what_changed ?? body.whatChanged, "No major change detected yet."),
    dobly_recommendations: asRecordArray(body.dobly_recommendations ?? body.doblyRecommendations, "Keep monitoring and approve sensitive work before it goes live."),
    needs_decision: asRecordArray(body.needs_decision ?? body.needsDecision, "No urgent owner decision is required right now."),
    opportunities: asRecordArray(body.opportunities, "No new opportunity surfaced yet."),
    risks: asRecordArray(body.risks, "No critical risk surfaced yet."),
    metrics_summary: body.metrics_summary && typeof body.metrics_summary === "object" ? (body.metrics_summary as Record<string, unknown>) : { legacy: true },
    period_start: typeof body.period_start === "string" ? body.period_start : null,
    period_end: typeof body.period_end === "string" ? body.period_end : null,
    created_at: row.generated_at,
    read_at: row.acknowledged_at,
  };
}

async function getPrimaryWorkspaceId(userId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function insertLegacyBriefing(params: CreateBriefingParams): Promise<Briefing> {
  const admin = createAdminSupabaseClient();
  const workspaceId = await getPrimaryWorkspaceId(params.userId);
  if (!workspaceId) {
    throw new Error("Failed to create briefing: workspace schema is active but no workspace exists for this user");
  }

  const { data, error } = await admin
    .from("briefings")
    .insert({
      workspace_id: workspaceId,
      briefing_type: appTypeToLegacyType(params.briefingType),
      title: briefingTitle(params.briefingType),
      summary: params.content.business_status,
      body: {
        ...params.content,
        period_start: params.periodStart ?? null,
        period_end: params.periodEnd ?? null,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create briefing: ${error?.message ?? "unknown error"}`);
  }

  return legacyToBriefing(data as LegacyBriefingRow, params.userId);
}

function gmToBriefingContent(
  briefing: Awaited<ReturnType<typeof createGeneralManagerBriefing>>,
): BriefingContent {
  return {
    business_status: briefing.businessStatus,
    what_happened: briefing.recentOutcomes.map((item) => ({ message: item })),
    what_matters: briefing.departmentNotes.map((item) => ({ message: item })),
    what_changed: briefing.recordPriorities.map((item) => ({
      title: `${item.department}: ${item.title}`,
      status: item.status,
      priority: item.priority,
      nextAction: item.nextAction,
    })),
    dobly_recommendations: briefing.nextMoves.map((item) => ({ action: item, reason: "Recommended from live department and record pressure." })),
    needs_decision: briefing.decisions.map((item) => ({ title: item, context: briefing.priority })),
    opportunities: briefing.opportunities.map((item) => ({ title: item })),
    risks: briefing.risks.map((item) => ({ title: item })),
    metrics_summary: {
      priority: briefing.priority,
      operatingMetrics: briefing.operatingMetrics,
      recordPriorities: briefing.recordPriorities,
    },
  };
}

function boardroomToBriefingContent(
  report: Awaited<ReturnType<typeof createBoardroomReport>>,
): BriefingContent {
  return {
    business_status: report.synthesis,
    what_happened: report.members.map((member) => ({
      title: `${member.role}: ${member.agentName}`,
      description: member.finding,
      confidence: member.confidence,
    })),
    what_matters: report.operatingPressure.map((item) => ({
      title: `${item.department}: ${item.records} records`,
      description: `${item.needsAction} need action, ${item.highPriority} high priority, pressure ${item.pressureScore}.`,
    })),
    what_changed: report.members
      .filter((member) => member.pressureScore)
      .map((member) => ({
        title: member.role,
        description: `${member.pressureScore} pressure score.`,
      })),
    dobly_recommendations: report.members.map((member) => ({
      action: member.recommendation,
      reason: member.finding,
    })),
    needs_decision: report.ownerDecisions.map((item) => ({ title: item })),
    opportunities: report.strategicOpportunities.map((item) => ({ title: item })),
    risks: report.strategicRisks.map((item) => ({ title: item })),
    metrics_summary: {
      period: report.period,
      strategicQuestion: report.strategicQuestion,
      strategicMetrics: report.strategicMetrics,
      operatingThesis: report.operatingThesis,
    },
  };
}

async function insertBriefing(params: CreateBriefingParams): Promise<Briefing> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("briefings")
    .insert({
      user_id: params.userId,
      briefing_type: params.briefingType,
      period_start: params.periodStart ?? null,
      period_end: params.periodEnd ?? null,
      read_at: null,
      ...params.content,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (briefingColumnMissing(error)) return insertLegacyBriefing(params);
    throw new Error(`Failed to create briefing: ${error?.message ?? "unknown error"}`);
  }

  return data as Briefing;
}

async function findFreshBriefing(userId: string, briefingType: BriefingType) {
  const admin = createAdminSupabaseClient();
  const cutoff = new Date(Date.now() - freshnessWindowHours(briefingType) * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("briefings")
    .select("*")
    .eq("user_id", userId)
    .eq("briefing_type", briefingType)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!briefingColumnMissing(error)) return null;
    const workspaceId = await getPrimaryWorkspaceId(userId);
    if (!workspaceId) return null;
    const legacy = await admin
      .from("briefings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("briefing_type", appTypeToLegacyType(briefingType))
      .gte("generated_at", cutoff)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (legacy.error || !legacy.data) return null;
    return legacyToBriefing(legacy.data as LegacyBriefingRow, userId);
  }
  return (data ?? null) as Briefing | null;
}

/**
 * Generate a briefing for the owner from live Homebase operating data.
 */
export async function generateBriefing(params: GenerateBriefingParams): Promise<Briefing> {
  const existing = await findFreshBriefing(params.userId, params.briefingType);
  if (existing) return existing;

  const period = periodWindow(params.briefingType);
  const content =
    params.briefingType === "weekly_summary"
      ? boardroomToBriefingContent(
          await createBoardroomReport({
            userId: params.userId,
            workspaceId: params.workspaceId ?? null,
          }),
        )
      : gmToBriefingContent(
          await createGeneralManagerBriefing({
            userId: params.userId,
            workspaceId: params.workspaceId ?? null,
          }),
        );

  if (params.briefingType === "risk_digest") {
    content.what_matters = content.risks.slice(0, 6);
    content.dobly_recommendations = content.dobly_recommendations.slice(0, 4);
  }

  if (params.briefingType === "opportunity") {
    content.what_matters = content.opportunities.slice(0, 6);
    content.risks = content.risks.slice(0, 3);
  }

  if (params.briefingType === "evening") {
    content.business_status = `Evening close: ${toLine(content.business_status)}`;
  }

  return insertBriefing({
    userId: params.userId,
    briefingType: params.briefingType,
    periodStart: period.start,
    periodEnd: period.end,
    content,
  });
}

export async function getOrCreateLatestBriefing(params: {
  userId: string;
  briefingType?: BriefingType;
  workspaceId?: string | null;
}) {
  const type = params.briefingType ?? "morning";
  const latest = await getLatestBriefing(params.userId, type);
  if (latest) {
    const freshCutoff = new Date(Date.now() - freshnessWindowHours(type) * 60 * 60 * 1000);
    if (new Date(latest.created_at) >= freshCutoff) {
      return latest;
    }
  }
  return generateBriefing({
    userId: params.userId,
    briefingType: type,
    workspaceId: params.workspaceId ?? null,
  });
}

/**
 * Get briefings for a user
 */
export async function getBriefings(
  userId: string,
  filters?: {
    briefingType?: BriefingType;
    unreadOnly?: boolean;
    limit?: number;
  },
): Promise<Briefing[]> {
  const admin = createAdminSupabaseClient();

  let query = admin.from("briefings").select("*").eq("user_id", userId);

  if (filters?.briefingType) query = query.eq("briefing_type", filters.briefingType);
  if (filters?.unreadOnly) query = query.is("read_at", null);

  query = query.order("created_at", { ascending: false });
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) {
    if (briefingColumnMissing(error)) {
      const workspaceId = await getPrimaryWorkspaceId(userId);
      if (!workspaceId) return [];
      let legacyQuery = admin.from("briefings").select("*").eq("workspace_id", workspaceId);
      if (filters?.briefingType) legacyQuery = legacyQuery.eq("briefing_type", appTypeToLegacyType(filters.briefingType));
      if (filters?.unreadOnly) legacyQuery = legacyQuery.is("acknowledged_at", null);
      legacyQuery = legacyQuery.order("generated_at", { ascending: false });
      if (filters?.limit) legacyQuery = legacyQuery.limit(filters.limit);
      const legacy = await legacyQuery;
      if (legacy.error) throw new Error(`Failed to fetch briefings: ${legacy.error.message}`);
      return ((legacy.data ?? []) as LegacyBriefingRow[]).map((row) => legacyToBriefing(row, userId));
    }
    throw new Error(`Failed to fetch briefings: ${error.message}`);
  }

  return (data ?? []) as Briefing[];
}

/**
 * Get latest briefing for a user
 */
export async function getLatestBriefing(
  userId: string,
  briefingType?: BriefingType,
): Promise<Briefing | null> {
  const briefings = await getBriefings(userId, { briefingType, limit: 1 });
  return briefings[0] ?? null;
}

/**
 * Mark briefing as read
 */
export async function markBriefingAsRead(briefingId: string, userId: string): Promise<Briefing> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("briefings")
    .update({ read_at: nowIso() })
    .eq("id", briefingId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    if (briefingColumnMissing(error)) {
      const { data: legacyData, error: legacyError } = await admin
        .from("briefings")
        .update({ acknowledged_at: nowIso() })
        .eq("id", briefingId)
        .select("*")
        .single();

      if (legacyError || !legacyData) {
        throw new Error(`Failed to mark briefing as read: ${legacyError?.message ?? "unknown error"}`);
      }

      return legacyToBriefing(legacyData as LegacyBriefingRow, userId);
    }
    throw new Error(`Failed to mark briefing as read: ${error?.message ?? "unknown error"}`);
  }

  return data as Briefing;
}
