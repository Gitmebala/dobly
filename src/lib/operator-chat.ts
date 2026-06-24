import "server-only";
import type { DoblyExecutionIntent } from "@/lib/dobly-inference";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getDoblyOperator, runDoblyOperator, type OperatorWithLoops } from "@/lib/dobly-operators";
import {
  buildDefaultOperatorQualityProfile,
  detectOperatorTaskLane,
  recordOperatorQualitySignal,
  type OperatorQualityProfileShape,
} from "@/lib/operator-quality";
import { saveOperatorQualityExample, type OperatorQualityExampleLevel } from "@/lib/operator-quality-examples";
import { createDurableRuntimeRun, completeDurableRuntimeRun } from "@/lib/runtime/durable-runtime";
import { storeRuntimeArtifactFile } from "@/lib/runtime/artifact-storage";

type JsonRecord = Record<string, unknown>;

export type OperatorMessageRole = "user" | "operator" | "system" | "approval" | "artifact" | "run";

export interface OperatorConversationRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  operator_id: string;
  title: string;
  status: "active" | "archived";
  summary: string;
  context: JsonRecord;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperatorMessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  workspace_id: string | null;
  operator_id: string;
  role: OperatorMessageRole;
  body: string;
  intent: string;
  run_id: string | null;
  job_id: string | null;
  approval_id: string | null;
  artifact_id: string | null;
  brain_trace_id: string | null;
  metadata: JsonRecord;
  created_at: string;
}

export interface OperatorChatSnapshot {
  operator: OperatorWithLoops;
  conversation: OperatorConversationRecord;
  messages: OperatorMessageRecord[];
  events: JsonRecord[];
  feedback: JsonRecord[];
  recentRuns: JsonRecord[];
  artifacts: JsonRecord[];
  approvals: JsonRecord[];
  voiceRecords: JsonRecord[];
  memoryProposals: JsonRecord[];
}

function inferChatIntent(prompt: string) {
  const lower = prompt.toLowerCase();
  if (/(change|instead|revise|redo|adjust|make it|update|fix|edit)/.test(lower)) return "direction_change";
  if (/(approve|reject|send|publish|charge|book|buy|delete)/.test(lower)) return "approval";
  if (/(show|open|view|download|artifact|file|draft|cad|design|report|video|doc)/.test(lower)) return "artifact";
  return "instruction";
}

function operatorReply(input: {
  operator: OperatorWithLoops;
  prompt: string;
  jobId: string;
  brainTraceId?: string | null;
  autonomyDecision?: unknown;
}) {
  const intent = inferChatIntent(input.prompt);
  const prefix = intent === "direction_change"
    ? "I have the new direction."
    : intent === "artifact"
    ? "I will keep the outputs attached here as they are created."
    : intent === "approval"
    ? "I will treat that as a control decision and keep risky actions gated."
    : "I am on it.";

  return [
    `${prefix} I queued this for ${input.operator.name} and will keep the run, approvals, artifacts, and follow-up questions in this chat.`,
    "If anything is missing, risky, or ambiguous, I will pause here instead of silently guessing.",
  ].join(" ");
}

function inferExampleLevel(input: {
  explicit?: string | null;
  feedbackType: "good" | "bad" | "correction" | "preference" | "bug" | "handoff";
}) {
  if (input.explicit === "gold" || input.explicit === "acceptable" || input.explicit === "rejected") {
    return input.explicit;
  }
  if (input.feedbackType === "good") return "gold";
  if (input.feedbackType === "bad" || input.feedbackType === "correction" || input.feedbackType === "bug") return "rejected";
  return "acceptable";
}

export async function recordOperatorChatEvent(input: {
  conversationId: string;
  messageId?: string | null;
  userId: string;
  workspaceId?: string | null;
  operatorId: string;
  runId?: string | null;
  eventType: string;
  title: string;
  summary?: string;
  severity?: "info" | "success" | "warning" | "danger";
  payload?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  await admin.from("operator_chat_events").insert({
    conversation_id: input.conversationId,
    message_id: input.messageId ?? null,
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    operator_id: input.operatorId,
    run_id: input.runId ?? null,
    event_type: input.eventType,
    title: input.title,
    summary: input.summary ?? "",
    severity: input.severity ?? "info",
    payload: input.payload ?? {},
  });
}

export async function appendOperatorChatMessage(input: {
  conversationId: string;
  userId: string;
  workspaceId?: string | null;
  operatorId: string;
  role: OperatorMessageRole;
  intent: string;
  body: string;
  runId?: string | null;
  approvalId?: string | null;
  artifactId?: string | null;
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operator_messages")
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      operator_id: input.operatorId,
      role: input.role,
      intent: input.intent,
      body: input.body,
      run_id: input.runId ?? null,
      approval_id: input.approvalId ?? null,
      artifact_id: input.artifactId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to append Operator chat message.");

  await admin
    .from("operator_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", input.conversationId)
    .eq("user_id", input.userId);

  return data as OperatorMessageRecord;
}

export async function ensureOperatorConversation(input: {
  userId: string;
  operatorId: string;
  workspaceId?: string | null;
  title?: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await admin
    .from("operator_conversations")
    .select("*")
    .eq("user_id", input.userId)
    .eq("operator_id", input.operatorId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as OperatorConversationRecord;

  const { data, error } = await admin
    .from("operator_conversations")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      operator_id: input.operatorId,
      title: input.title ?? "Operator Chat",
      context: {
        purpose: "Primary control surface for launching, steering, reviewing, and correcting Operator work.",
      },
      last_message_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create Operator chat.");

  await admin.from("operator_messages").insert({
    conversation_id: data.id,
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    operator_id: input.operatorId,
    role: "operator",
    intent: "system",
    body: "This is the Operator chat. Launch work here, change direction here, review artifacts here, and approve or reject important actions here.",
    metadata: {
      generatedBy: "dobly.operator_chat",
      primarySurface: true,
    },
  });

  return data as OperatorConversationRecord;
}

export async function listOperatorChat(input: {
  userId: string;
  operatorId: string;
  operator?: OperatorWithLoops;
}): Promise<OperatorChatSnapshot> {
  const admin = createAdminSupabaseClient();
  const operator = input.operator ?? await getDoblyOperator({ userId: input.userId, operatorId: input.operatorId });
  const conversation = await ensureOperatorConversation({
    userId: input.userId,
    operatorId: input.operatorId,
    workspaceId: operator.workspace_id,
    title: `${operator.name} Chat`,
  });

  const [messagesResult, eventsResult, feedbackResult, recentRunsResult, voiceByOperatorResult] = await Promise.all([
    admin
      .from("operator_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(80),
    admin
      .from("operator_chat_events")
      .select("*")
      .eq("conversation_id", conversation.id)
      .eq("visibility", "user_visible")
      .order("created_at", { ascending: false })
      .limit(60),
    admin
      .from("operator_chat_feedback")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("software_execution_runs")
      .select("id, status, task, summary, risk_level, approval_required, artifact_count, created_at, updated_at, context")
      .eq("user_id", input.userId)
      .contains("context", { operatorId: input.operatorId })
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("voice_call_records")
      .select("id, run_id, provider_call_id, direction, caller, callee, status, transcript, recording_url, handoff, telemetry, started_at, ended_at")
      .eq("user_id", input.userId)
      .contains("telemetry", { operatorId: input.operatorId })
      .order("started_at", { ascending: false })
      .limit(8),
  ]);
  const { data: messages, error: messagesError } = messagesResult;
  if (messagesError) throw new Error(messagesError.message);
  const events = eventsResult.data;
  const feedback = feedbackResult.data;
  const recentRuns = recentRunsResult.data;

  const runIds = (recentRuns ?? []).map((run: any) => run.id);
  const [artifactsResult, approvalsResult, voiceByRunResult, memoryResult] = runIds.length
    ? await Promise.all([
      admin
      .from("software_execution_artifacts")
      .select("id, run_id, kind, title, version, external_url, storage_path, metadata, created_at")
      .eq("user_id", input.userId)
      .in("run_id", runIds)
      .order("created_at", { ascending: false })
      .limit(12),
      admin
      .from("runtime_approvals")
      .select("id, run_id, title, message, action_label, risk_level, status, requested_at, decided_at, metadata")
      .eq("user_id", input.userId)
      .in("run_id", runIds)
      .order("requested_at", { ascending: false })
      .limit(12),
      admin
      .from("voice_call_records")
      .select("id, run_id, provider_call_id, direction, caller, callee, status, transcript, recording_url, handoff, telemetry, started_at, ended_at")
      .eq("user_id", input.userId)
      .in("run_id", runIds)
      .order("started_at", { ascending: false })
      .limit(8),
      admin
        .from("memory_update_proposals")
        .select("id, source_run_id, title, body, kind, confidence, conflict_summary, status, created_at")
        .eq("user_id", input.userId)
        .in("source_run_id", runIds)
        .order("created_at", { ascending: false })
        .limit(8),
    ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const artifacts = artifactsResult.data;
  const approvals = approvalsResult.data;
  const voiceRecordsByRun = voiceByRunResult.data;
  const voiceRecordsByOperator = voiceByOperatorResult.data;
  const memoryProposals = memoryResult.data;

  const voiceRecords = Array.from(
    new Map(
      [...(voiceRecordsByRun ?? []), ...(voiceRecordsByOperator ?? [])].map((row: any) => [String(row.id), row]),
    ).values(),
  )
    .sort((a: any, b: any) => Date.parse(String(b.started_at ?? 0)) - Date.parse(String(a.started_at ?? 0)))
    .slice(0, 8);

  return {
    operator,
    conversation,
    messages: [...(messages ?? [])].reverse() as OperatorMessageRecord[],
    events: (events ?? []) as JsonRecord[],
    feedback: (feedback ?? []) as JsonRecord[],
    recentRuns: (recentRuns ?? []) as JsonRecord[],
    artifacts: (artifacts ?? []) as JsonRecord[],
    approvals: (approvals ?? []) as JsonRecord[],
    voiceRecords: voiceRecords as JsonRecord[],
    memoryProposals: (memoryProposals ?? []) as JsonRecord[],
  };
}

export async function sendOperatorChatMessage(input: {
  userId: string;
  operatorId: string;
  prompt: string;
  workspaceId?: string | null;
  approved?: boolean;
}) {
  const admin = createAdminSupabaseClient();
  const operator = await getDoblyOperator({ userId: input.userId, operatorId: input.operatorId });
  const conversation = await ensureOperatorConversation({
    userId: input.userId,
    operatorId: input.operatorId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    title: `${operator.name} Chat`,
  });

  const intent = inferChatIntent(input.prompt);
  const { data: userMessage, error: userMessageError } = await admin
    .from("operator_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? operator.workspace_id,
      operator_id: operator.id,
      role: "user",
      intent,
      body: input.prompt,
      metadata: {
        source: "operator_chat",
        controlSurface: true,
      },
    })
    .select("*")
    .single();
  if (userMessageError || !userMessage) throw new Error(userMessageError?.message ?? "Failed to save message.");

  await recordOperatorChatEvent({
    conversationId: conversation.id,
    messageId: userMessage.id,
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    operatorId: operator.id,
    eventType: "user_input",
    title: "User gave direction",
    summary: input.prompt.slice(0, 240),
    payload: { intent },
  });

  const result = await runDoblyOperator({
    userId: input.userId,
    operatorId: operator.id,
    prompt: input.prompt,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    approved: input.approved ?? false,
    conversationId: conversation.id,
    sourceMessageId: userMessage.id,
  });

  await Promise.all([
    recordOperatorChatEvent({
      conversationId: conversation.id,
      messageId: userMessage.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? operator.workspace_id,
      operatorId: operator.id,
      eventType: "thinking_started",
      title: "Operator started thinking",
      summary: "Dobly checked mission, context, memory, missing info, and autonomy boundaries.",
      payload: { brainTraceId: result.brain.id ?? null },
    }),
    recordOperatorChatEvent({
      conversationId: conversation.id,
      messageId: userMessage.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? operator.workspace_id,
      operatorId: operator.id,
      eventType: "plan_created",
      title: "Plan created",
      summary: `${result.brain.plan.length} planned steps created for this instruction.`,
      payload: { plan: result.brain.plan },
    }),
    recordOperatorChatEvent({
      conversationId: conversation.id,
      messageId: userMessage.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? operator.workspace_id,
      operatorId: operator.id,
      eventType: "risk_checked",
      title: "Risk checked",
      summary: `Autonomy decision: ${String((result.brain.autonomy as JsonRecord).decision ?? "unknown")}.`,
      severity: (result.brain.riskAssessment as JsonRecord).level === "high" ? "warning" : "info",
      payload: { riskAssessment: result.brain.riskAssessment, autonomy: result.brain.autonomy },
    }),
    recordOperatorChatEvent({
      conversationId: conversation.id,
      messageId: userMessage.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? operator.workspace_id,
      operatorId: operator.id,
      eventType: "tool_selected",
      title: "Tools judged",
      summary: `${result.brain.toolJudgment.length} tool paths evaluated.`,
      payload: { toolJudgment: result.brain.toolJudgment },
    }),
    recordOperatorChatEvent({
      conversationId: conversation.id,
      messageId: userMessage.id,
      userId: input.userId,
      workspaceId: input.workspaceId ?? operator.workspace_id,
      operatorId: operator.id,
      eventType: "run_queued",
      title: "Run queued",
      summary: "The Operator run was placed on the durable background queue.",
      severity: "success",
      payload: { jobId: result.job.id, jobStatus: result.job.status },
    }),
  ]);

  const body = operatorReply({
    operator,
    prompt: input.prompt,
    jobId: result.job.id,
    brainTraceId: result.brain.id ?? null,
    autonomyDecision: result.brain.autonomy,
  });

  const { data: operatorMessage, error: operatorMessageError } = await admin
    .from("operator_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? operator.workspace_id,
      operator_id: operator.id,
      role: "operator",
      intent: "run_update",
      body,
      job_id: result.job.id,
      brain_trace_id: result.brain.id ?? null,
      metadata: {
        source: "operator_chat",
        queued: true,
        autonomy: result.brain.autonomy,
        plan: result.brain.plan,
        riskAssessment: result.brain.riskAssessment,
        missingInfo: result.brain.missingInfo,
      },
    })
    .select("*")
    .single();
  if (operatorMessageError || !operatorMessage) throw new Error(operatorMessageError?.message ?? "Failed to save Operator reply.");

  await admin
    .from("operator_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      summary: input.prompt.slice(0, 240),
    })
    .eq("id", conversation.id)
    .eq("user_id", input.userId);

  return {
    conversation,
    userMessage: userMessage as OperatorMessageRecord,
    operatorMessage: operatorMessage as OperatorMessageRecord,
    job: result.job,
    brain: result.brain,
  };
}

export async function recordOperatorChatFeedback(input: {
  userId: string;
  operatorId: string;
  messageId?: string | null;
  feedbackType: "good" | "bad" | "correction" | "preference" | "bug" | "handoff";
  body?: string;
  workspaceId?: string | null;
  metadata?: JsonRecord;
}) {
  const admin = createAdminSupabaseClient();
  const operator = await getDoblyOperator({ userId: input.userId, operatorId: input.operatorId });
  const conversation = await ensureOperatorConversation({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    title: `${operator.name} Chat`,
  });

  const { data: feedback, error } = await admin
    .from("operator_chat_feedback")
    .insert({
      conversation_id: conversation.id,
      message_id: input.messageId ?? null,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? operator.workspace_id,
      operator_id: operator.id,
      feedback_type: input.feedbackType,
      body: input.body ?? "",
      metadata: {
        source: "operator_chat",
        ...(input.metadata ?? {}),
      },
    })
    .select("*")
    .single();
  if (error || !feedback) throw new Error(error?.message ?? "Failed to save chat feedback.");

  await recordOperatorChatEvent({
    conversationId: conversation.id,
    messageId: input.messageId ?? null,
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    operatorId: operator.id,
    eventType: input.feedbackType === "handoff" ? "handoff_requested" : "feedback_received",
    title: input.feedbackType === "handoff" ? "Human handoff requested" : "Feedback received",
    summary: input.body ?? input.feedbackType,
    severity: input.feedbackType === "bad" || input.feedbackType === "bug" || input.feedbackType === "handoff" ? "warning" : "info",
    payload: { feedbackType: input.feedbackType },
  });

  await recordOperatorQualitySignal({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    signalType: input.feedbackType,
    body: input.body ?? "",
    metadata: input.metadata ?? {},
  }).catch(() => undefined);

  const artifactId = typeof input.metadata?.artifactId === "string" ? input.metadata.artifactId : null;
  const promoteAsExample = Boolean(input.metadata?.promoteAsExample);
  if (artifactId && promoteAsExample) {
    const { data: artifact } = await admin
      .from("software_execution_artifacts")
      .select("*")
      .eq("id", artifactId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (artifact) {
      const artifactMetadata = ((artifact as any).metadata ?? {}) as JsonRecord;
      const intent =
        artifactMetadata.doblyIntent && typeof artifactMetadata.doblyIntent === "object"
          ? (artifactMetadata.doblyIntent as DoblyExecutionIntent)
          : null;
      const profile =
        artifactMetadata.operatorQualityProfile && typeof artifactMetadata.operatorQualityProfile === "object"
          ? (artifactMetadata.operatorQualityProfile as OperatorQualityProfileShape)
          : buildDefaultOperatorQualityProfile({
              operatorKind: operator.kind,
              mission: operator.mission,
              outcome: operator.outcome,
            });

      const detectedLane = detectOperatorTaskLane({
        profile,
        prompt:
          typeof input.metadata?.taskType === "string"
            ? input.metadata.taskType
            : typeof artifact.title === "string"
              ? artifact.title
              : operator.mission,
        intent,
      });

      await saveOperatorQualityExample({
        userId: input.userId,
        workspaceId: input.workspaceId ?? operator.workspace_id,
        operatorId: operator.id,
        laneId:
          typeof input.metadata?.laneId === "string" && input.metadata.laneId.trim().length > 0
            ? input.metadata.laneId
            : detectedLane?.id ?? "general_quality",
        artifactKind: String((artifact as any).kind ?? "json"),
        qualityLevel: inferExampleLevel({
          explicit: typeof input.metadata?.qualityLevel === "string" ? input.metadata.qualityLevel : null,
          feedbackType: input.feedbackType,
        }) as OperatorQualityExampleLevel,
        title: String((artifact as any).title ?? operator.name),
        content: (((artifact as any).content ?? {}) as JsonRecord),
        rationale: input.body ?? null,
        tags: [intent?.departmentId, intent?.outputTypeId].filter(Boolean) as string[],
        sourceArtifactId: String((artifact as any).id),
        sourceFeedbackId: String((feedback as any).id),
      }).catch(() => undefined);
    }
  }

  const { data: message } = await admin
    .from("operator_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? operator.workspace_id,
      operator_id: operator.id,
      role: "system",
      intent: input.feedbackType === "handoff" ? "system" : "memory",
      body: input.feedbackType === "handoff"
        ? "Handoff requested. The Operator should pause and wait for human direction."
        : `Feedback saved: ${input.body ?? input.feedbackType}`,
      metadata: {
        feedbackType: input.feedbackType,
        source: "operator_chat_feedback",
        ...(input.metadata ?? {}),
      },
    })
    .select("*")
    .single();

  return { feedback, message };
}

export async function ingestOperatorVoiceTranscript(input: {
  userId: string;
  operatorId: string;
  transcript: string;
  workspaceId?: string | null;
  providerCallId?: string | null;
  recordingUrl?: string | null;
  audio?: {
    fileName: string;
    contentType: string;
    bytes: ArrayBuffer | Buffer;
  } | null;
}) {
  const operator = await getDoblyOperator({ userId: input.userId, operatorId: input.operatorId });
  const conversation = await ensureOperatorConversation({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    title: `${operator.name} Chat`,
  });

  let attachment: Awaited<ReturnType<typeof attachFileToOperatorChat>> | null = null;
  if (input.audio) {
    attachment = await attachFileToOperatorChat({
      userId: input.userId,
      operatorId: operator.id,
      workspaceId: input.workspaceId ?? operator.workspace_id,
      fileName: input.audio.fileName,
      contentType: input.audio.contentType,
      bytes: input.audio.bytes,
      title: `Voice note - ${input.audio.fileName}`,
      note: "Voice/audio source for this transcript.",
    });
  }

  const admin = createAdminSupabaseClient();
  await admin.from("voice_call_records").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? operator.workspace_id,
    provider_call_id: input.providerCallId ?? null,
    direction: "inbound",
    status: "completed",
    transcript: [{ speaker: "user", text: input.transcript, at: new Date().toISOString() }],
    recording_url: input.recordingUrl ?? null,
    telemetry: {
      source: "operator_chat_voice",
      operatorId: operator.id,
      conversationId: conversation.id,
      artifactId: attachment?.artifact?.id ?? null,
    },
    ended_at: new Date().toISOString(),
  }).catch(() => null);

  await recordOperatorChatEvent({
    conversationId: conversation.id,
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    operatorId: operator.id,
    eventType: "voice_transcript",
    title: "Voice transcript received",
    summary: input.transcript.slice(0, 240),
    payload: { providerCallId: input.providerCallId ?? null, recordingUrl: input.recordingUrl ?? null },
  });

  return sendOperatorChatMessage({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    prompt: `Voice transcript from the user:\n\n${input.transcript}`,
  });
}

export async function attachFileToOperatorChat(input: {
  userId: string;
  operatorId: string;
  workspaceId?: string | null;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer | Buffer;
  title?: string;
  note?: string;
}) {
  const admin = createAdminSupabaseClient();
  const operator = await getDoblyOperator({ userId: input.userId, operatorId: input.operatorId });
  const conversation = await ensureOperatorConversation({
    userId: input.userId,
    operatorId: operator.id,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    title: `${operator.name} Chat`,
  });

  const run = await createDurableRuntimeRun({
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    toolId: "operator_chat_attachment",
    toolLabel: "Operator Chat Attachment",
    toolFamily: "operator_chat",
    task: `Attach ${input.fileName} to ${operator.name}`,
    riskLevel: "low",
    context: {
      operatorId: operator.id,
      conversationId: conversation.id,
      sourceSurface: "operator_chat",
      attachment: {
        fileName: input.fileName,
        contentType: input.contentType,
      },
    },
  });

  const artifact = await storeRuntimeArtifactFile({
    userId: input.userId,
    workspaceId: input.workspaceId ?? operator.workspace_id,
    runId: run.id,
    fileName: input.fileName,
    contentType: input.contentType,
    bytes: input.bytes,
    title: input.title ?? input.fileName,
    metadata: {
      uploadedBy: "user",
      source: "operator_chat",
      operatorId: operator.id,
      conversationId: conversation.id,
      note: input.note ?? null,
    },
  });

  await completeDurableRuntimeRun({
    userId: input.userId,
    runId: run.id,
    status: "completed",
    summary: `${input.fileName} was attached to ${operator.name}.`,
    result: {
      artifactId: artifact.id,
      title: artifact.title,
      kind: artifact.kind,
    },
  });

  const { data: message, error } = await admin
    .from("operator_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? operator.workspace_id,
      operator_id: operator.id,
      role: "artifact",
      intent: "artifact",
      body: input.note
        ? `Attached ${input.fileName}. Note: ${input.note}`
        : `Attached ${input.fileName}. The Operator can now use this in the conversation.`,
      run_id: run.id,
      artifact_id: artifact.id,
      metadata: {
        source: "operator_chat_upload",
        artifact,
        contentType: input.contentType,
      },
    })
    .select("*")
    .single();
  if (error || !message) throw new Error(error?.message ?? "Failed to attach file to Operator chat.");

  await admin
    .from("operator_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversation.id)
    .eq("user_id", input.userId);

  return { conversation, run, artifact, message };
}
