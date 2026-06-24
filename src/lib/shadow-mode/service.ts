import { getLatestHealthSnapshot } from "@/lib/health/service";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { ShadowModeRun } from "@/types";

interface CreateShadowRunParams {
  coworkerId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  userId: string;
}

interface ProcessShadowEventParams {
  coworkerId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  userId: string;
}

interface UpdateShadowRunParams {
  shadowRunId: string;
  userId: string;
  updates: {
    ownerAction?: Record<string, unknown>;
    ownerApproved?: boolean;
    ownerFeedback?: string;
    wasCorrect?: boolean;
    learningSignal?: Record<string, unknown>;
  };
}

type CoworkerContext = {
  id: string;
  desk: string;
  role: string;
  autonomy_level: string | null;
  tools: string[] | null;
  permissions: Record<string, unknown> | null;
  approval_boundaries: Record<string, unknown> | null;
  escalation_rules: Record<string, unknown> | null;
};

export async function createShadowRun(params: CreateShadowRunParams): Promise<ShadowModeRun> {
  const admin = createAdminSupabaseClient();
  const proposal = await generateShadowProposal(params.coworkerId, params.eventType, params.eventData, params.userId);

  const { data, error } = await admin
    .from("shadow_mode_runs")
    .insert({
      coworker_id: params.coworkerId,
      event_type: params.eventType,
      event_data: params.eventData,
      proposed_action: proposal.action,
      proposed_message: proposal.message,
      reasoning: proposal.reasoning,
      owner_action: null,
      owner_approved: null,
      owner_feedback: null,
      was_correct: null,
      learning_signal: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create shadow run: ${error.message}`);
  }

  return data as ShadowModeRun;
}

export async function processShadowEvent(params: ProcessShadowEventParams): Promise<{
  shadowRun: ShadowModeRun;
  shouldExecute: boolean;
  confidence: number;
}> {
  const shadowRun = await createShadowRun(params);
  const shouldExecute = await determineExecutionReadiness(params.coworkerId, params.userId, shadowRun);

  return {
    shadowRun,
    shouldExecute,
    confidence: Number((shadowRun.proposed_action.confidence as number) ?? 0.5),
  };
}

export async function updateShadowRun(params: UpdateShadowRunParams): Promise<ShadowModeRun> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("shadow_mode_runs")
    .update(params.updates)
    .eq("id", params.shadowRunId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update shadow run: ${error.message}`);
  }

  if (params.updates.wasCorrect !== undefined) {
    const learningSignal = await extractLearningSignal(params.shadowRunId, params.userId);
    if (learningSignal) {
      const coworkerId = typeof data.coworker_id === "string" ? data.coworker_id : "";
      if (coworkerId) await applyLearningSignal(coworkerId, params.userId, learningSignal);
    }
  }

  return data as ShadowModeRun;
}

export async function getShadowRuns(coworkerId: string, userId: string, filters?: {
  ownerApproved?: boolean;
  wasCorrect?: boolean;
  limit?: number;
}): Promise<ShadowModeRun[]> {
  const admin = createAdminSupabaseClient();

  let query = admin.from("shadow_mode_runs").select("*").eq("coworker_id", coworkerId);
  if (filters?.ownerApproved !== undefined) query = query.eq("owner_approved", filters.ownerApproved);
  if (filters?.wasCorrect !== undefined) query = query.eq("was_correct", filters.wasCorrect);
  query = query.order("created_at", { ascending: false });
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch shadow runs: ${error.message}`);
  return (data || []) as ShadowModeRun[];
}

export async function getShadowModeSummary(coworkerId: string, userId: string): Promise<{
  totalRuns: number;
  approvedRuns: number;
  rejectedRuns: number;
  accuracy: number;
  confidenceScore: number;
  learningSignals: number;
}> {
  const shadowRuns = await getShadowRuns(coworkerId, userId);
  const totalRuns = shadowRuns.length;
  const approvedRuns = shadowRuns.filter((run) => run.owner_approved === true).length;
  const rejectedRuns = shadowRuns.filter((run) => run.owner_approved === false).length;
  const reviewedRuns = shadowRuns.filter((run) => run.was_correct !== null);
  const correctRuns = reviewedRuns.filter((run) => run.was_correct === true).length;
  const accuracy = reviewedRuns.length > 0 ? correctRuns / reviewedRuns.length : 0;
  const learningSignals = shadowRuns.filter((run) => run.learning_signal !== null).length;
  const confidenceScore =
    totalRuns > 0
      ? shadowRuns.reduce((sum, run) => sum + Number(run.proposed_action.confidence ?? 0.5), 0) / totalRuns
      : 0.5;

  return {
    totalRuns,
    approvedRuns,
    rejectedRuns,
    accuracy,
    confidenceScore,
    learningSignals,
  };
}

async function generateShadowProposal(
  coworkerId: string,
  eventType: string,
  eventData: Record<string, unknown>,
  userId: string,
): Promise<{
  action: Record<string, unknown>;
  message: string;
  reasoning: string;
}> {
  const coworker = await getCoworkerContext(coworkerId, userId);
  if (!coworker) {
    return {
      action: { type: "escalate", confidence: 0.25, requiresApproval: true },
      message: "I could not load this coworker cleanly, so I would escalate instead of guessing.",
      reasoning: "Shadow mode could not read the coworker context safely.",
    };
  }

  const urgency = String(eventData.urgency ?? "normal").toLowerCase();
  const sentiment = String(eventData.sentiment ?? "").toLowerCase();
  const invoiceAge = Number(eventData.invoice_age_days ?? 0);
  const text = String(eventData.message ?? eventData.summary ?? "").trim();
  const hasConflict = Boolean(eventData.conflicting_requirements);
  const confidenceBase = inferBaseConfidence(coworker, eventType, eventData);
  const risky = urgency === "critical" || sentiment === "angry" || hasConflict || invoiceAge >= 30;
  const autoApproveThreshold = Number(coworker.approval_boundaries?.auto_approve_threshold ?? 0.7);

  let action: Record<string, unknown>;
  let message: string;
  let reasoning: string;

  if (eventType === "payment_reminder" || coworker.desk === "finance_desk") {
    const tone = invoiceAge >= 30 ? "firm" : "polite";
    action = {
      type: "send_reminder",
      channel: "whatsapp",
      tone,
      confidence: clamp(confidenceBase - (risky ? 0.08 : 0), 0.2, 0.96),
      requiresApproval: risky,
    };
    message =
      tone === "firm"
        ? "I would send a firmer follow-up and surface any dispute before money movement or commitments."
        : "I would send a polite payment reminder and keep the record updated.";
    reasoning = risky
      ? "This invoice is old enough to require a stronger tone and probably an owner checkpoint."
      : "The finance desk can handle a routine reminder without adding extra friction.";
  } else if (eventType === "support_case" || coworker.desk === "support_desk") {
    const escalate = risky || /refund|legal|threat/i.test(text);
    action = {
      type: escalate ? "escalate_case" : "draft_resolution",
      channel: "support",
      confidence: clamp(confidenceBase - (escalate ? 0.12 : 0), 0.18, 0.94),
      requiresApproval: escalate,
    };
    message = escalate
      ? "I would summarize the issue, capture the facts, and escalate with a recommended response."
      : "I would draft a support reply and move the case toward resolution.";
    reasoning = escalate
      ? "The issue carries refund, anger, or policy risk, so owner review is safer than autonomous resolution."
      : "This looks like a standard support workflow with enough context to proceed.";
  } else {
    const qualifiesLead = /price|interested|quote|book|demo|service/i.test(text) || urgency === "high";
    const escalate = risky && confidenceBase < autoApproveThreshold;
    action = {
      type: qualifiesLead ? "qualify_and_follow_up" : "respond",
      channel: "whatsapp",
      confidence: clamp(confidenceBase - (escalate ? 0.1 : 0), 0.2, 0.95),
      requiresApproval: escalate,
      escalate,
    };
    message = qualifiesLead
      ? "I would qualify the lead, draft the next step, and only pull in the owner if the risk or promise is too high."
      : "I would respond with the standard desk guidance and keep the feed updated.";
    reasoning = qualifiesLead
      ? "The message looks like an active commercial opportunity, so the right move is qualification with clear next steps."
      : "This is routine desk traffic and does not need a complex path.";
  }

  return {
    action,
    message,
    reasoning,
  };
}

async function determineExecutionReadiness(coworkerId: string, userId: string, shadowRun: ShadowModeRun): Promise<boolean> {
  const [summary, health] = await Promise.all([
    getShadowModeSummary(coworkerId, userId),
    getLatestHealthSnapshot(coworkerId, userId).catch(() => null),
  ]);

  const proposedConfidence = Number(shadowRun.proposed_action.confidence ?? 0.5);
  const requiresApproval = Boolean(shadowRun.proposed_action.requiresApproval);
  if (requiresApproval) return false;
  if (summary.totalRuns < 8) return false;
  if (summary.accuracy < 0.75) return false;
  if (summary.confidenceScore < 0.72) return false;
  if (proposedConfidence < 0.72) return false;
  if (health && ["underperforming", "needs_review"].includes(health.health_state)) return false;
  return true;
}

async function extractLearningSignal(shadowRunId: string, userId: string): Promise<Record<string, unknown> | null> {
  const admin = createAdminSupabaseClient();
  const { data: shadowRun } = await admin.from("shadow_mode_runs").select("*").eq("id", shadowRunId).single();
  if (!shadowRun) return null;

  if (shadowRun.was_correct === true) {
    return {
      type: "positive_reinforcement",
      pattern: {
        event_type: shadowRun.event_type,
        action_type: shadowRun.proposed_action?.type ?? "unknown",
        confidence: shadowRun.proposed_action?.confidence ?? 0.5,
      },
      outcome: "correct",
      timestamp: new Date().toISOString(),
    };
  }

  if (shadowRun.was_correct === false) {
    return {
      type: "negative_reinforcement",
      pattern: {
        event_type: shadowRun.event_type,
        action_type: shadowRun.proposed_action?.type ?? "unknown",
        confidence: shadowRun.proposed_action?.confidence ?? 0.5,
      },
      outcome: "incorrect",
      correction: shadowRun.owner_feedback,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

async function applyLearningSignal(coworkerId: string, userId: string, learningSignal: Record<string, unknown>): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data: coworker } = await admin.from("coworkers").select("learning_loop").eq("id", coworkerId).single();
  if (!coworker) return;

  const currentLearningLoop = (coworker.learning_loop as Record<string, unknown> | null) ?? {};
  const signals = ((currentLearningLoop.signals as Record<string, unknown>[] | undefined) ?? []).slice(-99);
  signals.push(learningSignal);

  await admin
    .from("coworkers")
    .update({
      learning_loop: {
        ...currentLearningLoop,
        signals,
        last_updated: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", coworkerId)
    .eq("user_id", userId);
}

async function getCoworkerContext(coworkerId: string, userId: string): Promise<CoworkerContext | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("coworkers")
    .select("id,desk,role,autonomy_level,tools,permissions,approval_boundaries,escalation_rules")
    .eq("id", coworkerId)
    .eq("user_id", userId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`Failed to fetch coworker: ${error.message}`);
  return data as CoworkerContext;
}

function inferBaseConfidence(coworker: CoworkerContext, eventType: string, eventData: Record<string, unknown>) {
  const tools = coworker.tools ?? [];
  let confidence = 0.58 + Math.min(tools.length, 4) * 0.06;

  if (coworker.autonomy_level === "delegated") confidence += 0.08;
  if (coworker.autonomy_level === "guarded") confidence += 0.03;
  if (coworker.autonomy_level === "supervised") confidence -= 0.04;

  if (eventType === "payment_reminder" && coworker.desk === "finance_desk") confidence += 0.07;
  if (eventType === "support_case" && coworker.desk === "support_desk") confidence += 0.07;
  if (eventType === "inbound_message" && coworker.desk === "customer_desk") confidence += 0.06;
  if (Boolean(eventData.conflicting_requirements)) confidence -= 0.12;
  if (String(eventData.sentiment ?? "").toLowerCase() === "angry") confidence -= 0.1;

  return clamp(confidence, 0.2, 0.96);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
