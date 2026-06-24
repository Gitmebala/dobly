"use client";

import { FormEvent, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  PanelRightOpen,
  PauseCircle,
  ShieldCheck,
  Share2,
  Sparkles,
  User,
  Video,
  X,
} from "lucide-react";

type JsonRecord = Record<string, any>;

type ChatMessage = {
  id: string;
  role: "user" | "operator" | "system" | "approval" | "artifact" | "run";
  body: string;
  intent: string;
  job_id?: string | null;
  run_id?: string | null;
  approval_id?: string | null;
  artifact_id?: string | null;
  brain_trace_id?: string | null;
  metadata?: JsonRecord;
  created_at: string;
};

type OperatorChatConsoleProps = {
  operator: {
    id: string;
    name: string;
    mission: string;
    outcome: string;
    status: string;
    approval_mode: string;
    capability_tags: string[];
    last_run_at: string | null;
    loops: Array<{ id: string; name: string; cadence: string; status: string; trigger: string }>;
  };
  conversation: {
    id: string;
    title: string;
    summary: string;
    last_message_at: string | null;
  };
  messages: ChatMessage[];
  events: JsonRecord[];
  feedback: JsonRecord[];
  recentRuns: JsonRecord[];
  artifacts: JsonRecord[];
  approvals: JsonRecord[];
  voiceRecords: JsonRecord[];
  memoryProposals: JsonRecord[];
};

const quickDirections = [
  { label: "Show plan", prompt: "Show me your thinking, current plan, risks, and next action." },
  { label: "Improve draft", prompt: "Change direction: make the result more premium and show me the next draft here." },
  { label: "Require approval", prompt: "Before you send, publish, book, charge, or modify anything, bring it here for approval." },
  { label: "Show work", prompt: "Show every artifact, draft, approval, tool call, and open question connected to this work." },
];

type InspectorTab = "overview" | "review" | "outputs" | "activity" | "control";

const operatorControlPrompts = [
  "Pause this Operator and explain what is blocked.",
  "Continue from the latest draft, but improve quality before external action.",
  "Compare two options and recommend the safer one.",
  "Turn the latest output into a client-ready document.",
  "Create a revision list from my feedback.",
  "Summarize what changed since the last run.",
];

function formatTime(value?: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusTone(status?: string) {
  if (status === "completed" || status === "approved" || status === "active") return "text-emerald-300";
  if (status === "failed" || status === "rejected") return "text-red-300";
  if (status === "needs_approval" || status === "pending") return "text-amber-300";
  return "text-[var(--dobly-text-muted)]";
}

function artifactIcon(artifact: JsonRecord) {
  const contentType = String(artifact.content?.contentType ?? artifact.metadata?.contentType ?? "").toLowerCase();
  const kind = String(artifact.kind ?? "").toLowerCase();
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType.startsWith("video/")) return Video;
  if (kind.includes("json") || contentType.includes("json")) return FileJson;
  return FileText;
}

function artifactPreviewType(artifact: JsonRecord) {
  const contentType = String(artifact.content?.contentType ?? artifact.metadata?.contentType ?? "").toLowerCase();
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.includes("pdf")) return "pdf";
  return "file";
}

export default function OperatorChatConsole(props: OperatorChatConsoleProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState(props.messages);
  const [approvals, setApprovals] = useState(props.approvals);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [artifacts, setArtifacts] = useState(props.artifacts);
  const [prompt, setPrompt] = useState("");
  const [attachmentNote, setAttachmentNote] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [activeArtifact, setActiveArtifact] = useState<JsonRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [voicePending, setVoicePending] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState<string | null>(null);
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("overview");
  const [isPending, startTransition] = useTransition();

  const pendingApprovals = useMemo(
    () => approvals.filter((approval) => approval.status === "pending"),
    [approvals],
  );
  const handoffTimeline = useMemo(() => {
    const messageEntries = messages
      .filter((message) => message.metadata?.handoff)
      .map((message) => ({
        id: `message-${message.id}`,
        title: message.body,
        summary: String(message.metadata?.source ?? "coworker chat"),
        createdAt: message.created_at,
        handoff: message.metadata?.handoff as JsonRecord,
      }));
    const eventEntries = props.events
      .filter((event) => event.event_type === "handoff_received" || event.event_type === "handoff_requested" || event.payload?.handoff)
      .map((event) => ({
        id: `event-${event.id}`,
        title: String(event.title ?? "Handoff"),
        summary: String(event.summary ?? ""),
        createdAt: String(event.created_at ?? new Date().toISOString()),
        handoff: (event.payload?.handoff ?? {}) as JsonRecord,
      }));
    return [...messageEntries, ...eventEntries]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 8);
  }, [messages, props.events]);

  function sendPrompt(nextPrompt = prompt) {
    const trimmed = nextPrompt.trim();
    if (!trimmed) return;
    setError(null);

    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      intent: "instruction",
      body: trimmed,
      created_at: new Date().toISOString(),
      metadata: { optimistic: true },
    };
    setMessages((current) => [...current, optimistic]);
    setPrompt("");

    startTransition(async () => {
      const response = await fetch(`/api/operators/${props.operator.id}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not send that to the Operator.");
        setMessages((current) => current.filter((message) => message.id !== optimistic.id));
        return;
      }

      setMessages((current) => [
        ...current.filter((message) => message.id !== optimistic.id),
        data.userMessage,
        data.operatorMessage,
      ]);
      router.refresh();
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
    });
  }

  async function uploadAttachment(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("note", attachmentNote);
      const response = await fetch(`/api/operators/${props.operator.id}/chat/artifacts`, {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not attach file.");
        return;
      }
      setMessages((current) => [...current, data.message]);
      setArtifacts((current) => [data.artifact, ...current]);
      setAttachmentNote("");
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function decideApproval(approvalId: string, decision: "approved" | "rejected") {
    setDecisionLoading(`${approvalId}:${decision}`);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${approvalId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not update approval.");
        return;
      }
      setApprovals((current) => current.map((approval) => approval.id === approvalId ? { ...approval, status: decision } : approval));
      setMessages((current) => [
        ...current,
        {
          id: `approval-${approvalId}-${Date.now()}`,
          role: "approval",
          intent: "approval",
          approval_id: approvalId,
          body: decision === "approved" ? "Approved in chat. The Operator can continue from this decision." : "Rejected in chat. The Operator should revise, pause, or ask for another path.",
          created_at: new Date().toISOString(),
          metadata: { decision },
        },
      ]);
      router.refresh();
    } finally {
      setDecisionLoading(null);
    }
  }

  async function sendFeedback(feedbackType: "good" | "bad" | "correction" | "preference" | "bug" | "handoff", body = "") {
    setFeedbackPending(feedbackType);
    setError(null);
    try {
      const response = await fetch(`/api/operators/${props.operator.id}/chat/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feedbackType, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save feedback.");
        return;
      }
      if (data.message) setMessages((current) => [...current, data.message]);
      router.refresh();
    } finally {
      setFeedbackPending(null);
    }
  }

  async function submitVoiceTranscript() {
    const transcript = voiceTranscript.trim();
    if (!transcript) return;
    setVoicePending(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("transcript", transcript);
      const response = await fetch(`/api/operators/${props.operator.id}/chat/voice`, {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not submit voice transcript.");
        return;
      }
      setMessages((current) => [...current, data.userMessage, data.operatorMessage]);
      setVoiceTranscript("");
      router.refresh();
    } finally {
      setVoicePending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendPrompt();
  }

  return (
    <section className="operator-chat-console">
      <div className="operator-chat-layout">
        <div className="operator-conversation">
          <div className="operator-conversation-header">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(196,80,26,0.3)] bg-[rgba(196,80,26,0.12)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--dobly-accent)]">
                  Live coworker
                </span>
                <span className="badge-muted capitalize">{props.operator.status}</span>
              </div>
              <h2 className="mt-3 font-display text-3xl text-[var(--dobly-text)]">{props.operator.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
                {props.operator.mission}
              </p>
            </div>
            <div className="operator-header-actions">
              <span className="operator-last-active">Last active {formatTime(props.operator.last_run_at)}</span>
              <button type="button" className="operator-details-button" onClick={() => setInspectorOpen(true)}>
                <PanelRightOpen aria-hidden="true" />
                Details
                {pendingApprovals.length ? <strong>{pendingApprovals.length}</strong> : null}
              </button>
            </div>
          </div>

          <div ref={listRef} className="operator-chat-thread">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isPending ? (
              <div className="rounded-[1rem] border border-[rgba(196,80,26,0.28)] bg-[rgba(196,80,26,0.08)] p-4 text-sm text-[var(--dobly-text-muted)]">
                <div className="flex items-center gap-2 text-[var(--dobly-text)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--dobly-accent)]" />
                  Coworker is planning, checking risk, choosing tools, and queueing the run...
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {["Understand", "Choose tools", "Check risk", "Queue run"].map((step) => (
                    <div key={step} className="rounded-[0.75rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.1)] px-3 py-2 text-xs">{step}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="operator-chat-composer">
            <div className="operator-quick-directions">
              {quickDirections.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => sendPrompt(item.prompt)}
                  disabled={isPending}
                  title={item.prompt}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="grid gap-3">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                placeholder={`Message ${props.operator.name}...`}
                className="resize-none rounded-[1rem] border border-[var(--dobly-border)] bg-[color-mix(in_srgb,var(--dobly-bg)_82%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--dobly-text)] outline-none focus:border-[rgba(196,80,26,0.45)]"
              />
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                <input
                  value={attachmentNote}
                  onChange={(event) => setAttachmentNote(event.target.value)}
                  placeholder="Optional note for attached image, doc, video, CAD file, or reference..."
                  className="rounded-[0.9rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] px-3 py-3 text-sm text-[var(--dobly-text)] outline-none focus:border-[rgba(196,80,26,0.45)]"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => uploadAttachment(event.target.files?.[0])}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.json,.txt,.md,.zip,.stl,.obj,.step,.stp,.dwg,.dxf"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary justify-center disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  Attach
                </button>
                <button type="submit" disabled={isPending || prompt.trim().length < 2} className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </form>
            <div className="operator-composer-tools">
              <details>
                <summary>Voice transcript</summary>
                <div>
                  <textarea value={voiceTranscript} onChange={(event) => setVoiceTranscript(event.target.value)} rows={2} placeholder="Add spoken direction or a call transcript." />
                  <button type="button" onClick={submitVoiceTranscript} disabled={voicePending || voiceTranscript.trim().length < 2}>
                    {voicePending ? "Sending..." : "Send transcript"}
                  </button>
                </div>
              </details>
            </div>
            <details className="operator-feedback-menu">
              <summary>Give feedback</summary>
              <div className="operator-feedback-row">
                {[
                  ["good", "Good"],
                  ["bad", "Not right"],
                  ["correction", "Correct it"],
                  ["preference", "Remember this"],
                  ["bug", "Report a problem"],
                  ["handoff", "Take over"],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={Boolean(feedbackPending)}
                    onClick={() => sendFeedback(type as any, label)}
                  >
                    {feedbackPending === type ? "Saving..." : label}
                  </button>
                ))}
              </div>
            </details>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </div>
        </div>

        {inspectorOpen ? <button type="button" className="operator-inspector-scrim" onClick={() => setInspectorOpen(false)} aria-label="Close coworker details" /> : null}
        <aside className="operator-chat-inspector operator-inspector-drawer" data-open={inspectorOpen} aria-hidden={!inspectorOpen}>
          <header className="operator-inspector-drawer-header">
            <div>
              <strong>Coworker details</strong>
              <span>{props.operator.approval_mode.replace("_", " ")} approval mode</span>
            </div>
            <button type="button" onClick={() => setInspectorOpen(false)} aria-label="Close coworker details" title="Close">
              <X aria-hidden="true" />
            </button>
          </header>
          <nav aria-label="Coworker details">
            {([
              ["overview", "Overview"],
              ["review", `Review ${pendingApprovals.length || ""}`],
              ["outputs", `Outputs ${artifacts.length || ""}`],
              ["activity", "Activity"],
              ["control", "Control"],
            ] as Array<[InspectorTab, string]>).map(([id, label]) => (
              <button key={id} type="button" data-active={inspectorTab === id} onClick={() => setInspectorTab(id)}>{label}</button>
            ))}
          </nav>

          <div className="operator-inspector-scroll">
            {inspectorTab === "overview" ? (
              <>
                <ControlCard icon={Clock3} title="Recent runs" value={`${props.recentRuns.length}`}>
                  {props.recentRuns.slice(0, 8).map((run) => <RunItem key={run.id} run={run} />)}
                  {!props.recentRuns.length ? <p>No runs yet.</p> : null}
                </ControlCard>
                <ControlCard icon={Sparkles} title="Memory and voice" value={`${props.memoryProposals.length + props.voiceRecords.length}`}>
                  {props.memoryProposals.slice(0, 4).map((memory) => <SideMini key={memory.id} title={memory.title} meta={`memory ${memory.status}`} />)}
                  {props.voiceRecords.slice(0, 3).map((voice) => <SideMini key={voice.id} title="Voice transcript" meta={voice.status} />)}
                  {!props.memoryProposals.length && !props.voiceRecords.length ? <p>No signals yet.</p> : null}
                </ControlCard>
              </>
            ) : null}

            {inspectorTab === "review" ? (
              <ControlCard icon={ShieldCheck} title="Approval inbox" value={pendingApprovals.length ? `${pendingApprovals.length} waiting` : "Clear"}>
                {approvals.slice(0, 12).map((approval) => <ApprovalItem key={approval.id} approval={approval} loading={decisionLoading} onDecision={decideApproval} />)}
                {!approvals.length ? <p>No approvals waiting.</p> : null}
              </ControlCard>
            ) : null}

            {inspectorTab === "outputs" ? (
              <ControlCard icon={FileText} title="Artifacts" value={`${artifacts.length}`}>
                {artifacts.slice(0, 16).map((artifact) => <ArtifactItem key={artifact.id} artifact={artifact} onPreview={() => setActiveArtifact(artifact)} />)}
                {!artifacts.length ? <p>No artifacts yet.</p> : null}
              </ControlCard>
            ) : null}

            {inspectorTab === "activity" ? (
              <>
                <ControlCard icon={Share2} title="Handoffs" value={`${handoffTimeline.length}`}>
                  {handoffTimeline.map((entry) => (
                    <div key={entry.id} className="operator-inspector-row">
                      <strong>{entry.title}</strong>
                      <small>{String(entry.handoff?.fromDepartment ?? "dobly").replaceAll("_", " ")} to {String(entry.handoff?.assignedWorkerName ?? entry.handoff?.toDepartment ?? "next desk").replaceAll("_", " ")}</small>
                    </div>
                  ))}
                  {!handoffTimeline.length ? <p>No handoffs yet.</p> : null}
                </ControlCard>
                <ControlCard icon={BrainCircuit} title="Events" value={`${props.events.length}`}>
                  {props.events.slice(0, 16).map((event) => <EventItem key={event.id} event={event} />)}
                  {!props.events.length ? <p>No activity yet.</p> : null}
                </ControlCard>
              </>
            ) : null}

            {inspectorTab === "control" ? (
              <ControlCard icon={Sparkles} title="Steer this coworker" value="Commands">
                {operatorControlPrompts.map((item) => <button key={item} onClick={() => sendPrompt(item)} className="operator-control-prompt">{item}</button>)}
              </ControlCard>
            ) : null}
          </div>
        </aside>
      </div>

      {activeArtifact ? <ArtifactPreviewModal artifact={activeArtifact} onClose={() => setActiveArtifact(null)} /> : null}
    </section>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isArtifact = message.role === "artifact";
  const isApproval = message.role === "approval";
  const Icon = isUser ? User : isArtifact ? FileText : isApproval ? ShieldCheck : message.role === "system" ? PauseCircle : Bot;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgba(196,80,26,0.28)] bg-[rgba(196,80,26,0.12)] text-[var(--dobly-accent)]">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className={`max-w-[86%] rounded-[1.1rem] border p-4 ${isUser ? "border-[rgba(196,80,26,0.34)] bg-[rgba(196,80,26,0.16)]" : "border-[var(--dobly-border)] bg-[rgba(255,255,255,0.026)]"}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
            {isUser ? "You" : message.role === "operator" ? "Coworker" : message.role}
          </span>
          <span className="rounded-full border border-[var(--dobly-border)] px-2 py-0.5 text-[10px] text-[var(--dobly-text-muted)]">{message.intent.replace("_", " ")}</span>
          <span className="text-[10px] text-[var(--dobly-text-dim)]">{formatTime(message.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--dobly-text-secondary)]">{message.body}</p>
        <OperatorThinking message={message} />
        <MessageArtifactPreview message={message} />
      </div>
      {isUser ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.04)] text-[var(--dobly-text-muted)]">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}

function OperatorThinking({ message }: { message: ChatMessage }) {
  const metadata = message.metadata ?? {};
  const plan = Array.isArray(metadata.plan) ? metadata.plan : [];
  const autonomy = metadata.autonomy;
  const risk = metadata.riskAssessment;
  const missingInfo = metadata.missingInfo;
  if (!plan.length && !autonomy && !risk && !missingInfo && !message.job_id && !message.brain_trace_id) return null;

  return (
    <details className="mt-4 rounded-[0.9rem] border border-[rgba(196,80,26,0.22)] bg-[rgba(196,80,26,0.06)] p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dobly-accent)]">
        Work details
      </summary>
      <div className="mt-3 grid gap-3">
        {plan.length ? (
          <div className="grid gap-2">
            {plan.slice(0, 8).map((step: JsonRecord, index: number) => (
              <div key={step.id ?? index} className="rounded-[0.75rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.12)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[var(--dobly-text)]">{step.title ?? `Step ${index + 1}`}</div>
                  <span className="rounded-full border border-[var(--dobly-border)] px-2 py-0.5 text-[10px] text-[var(--dobly-text-muted)]">{step.phase ?? "plan"}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--dobly-text-muted)]">{step.purpose ?? step.expectedOutput}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.13em] text-[var(--dobly-text-dim)]">
                  <span>{step.toolPreference ?? "tool judgment"}</span>
                  <span>{step.riskLevel ?? "risk unknown"}</span>
                  {step.requiresApproval ? <span className="text-amber-300">needs approval</span> : <span>safe to continue</span>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2">
          {autonomy ? <InfoBlock title="Autonomy" data={autonomy} /> : null}
          {risk ? <InfoBlock title="Risk" data={risk} /> : null}
          {missingInfo ? <InfoBlock title="Missing Info" data={missingInfo} /> : null}
          {message.job_id || message.brain_trace_id ? (
            <div className="rounded-[0.75rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.12)] p-3 text-xs text-[var(--dobly-text-muted)]">
              {message.job_id ? <div>Queued job: <span className="font-mono text-[var(--dobly-text)]">{message.job_id.slice(0, 8)}</span></div> : null}
              {message.brain_trace_id ? <div className="mt-1">Brain trace: <span className="font-mono text-[var(--dobly-text)]">{message.brain_trace_id.slice(0, 8)}</span></div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function MessageArtifactPreview({ message }: { message: ChatMessage }) {
  const artifact = message.metadata?.artifact;
  if (!artifact) return null;
  const Icon = artifactIcon(artifact);
  return (
    <div className="mt-4 rounded-[0.9rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.12)] p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[0.75rem] bg-[rgba(196,80,26,0.14)] text-[var(--dobly-accent)]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm font-semibold text-[var(--dobly-text)]">{artifact.title}</div>
          <p className="mt-1 text-xs text-[var(--dobly-text-muted)]">{artifact.kind} artifact, version {artifact.version}</p>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-[0.75rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.12)] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{title}</div>
      <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-[var(--dobly-text-muted)]">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function ControlCard({ icon: Icon, title, value, children }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; children: React.ReactNode }) {
  return (
    <section className="operator-inspector-section">
      <header>
        <div>
          <Icon className="h-4 w-4 text-[var(--dobly-accent)]" />
          <strong>{title}</strong>
        </div>
        <span>{value}</span>
      </header>
      <div className="operator-inspector-content">{children}</div>
    </section>
  );
}

function ApprovalItem({ approval, loading, onDecision }: { approval: JsonRecord; loading: string | null; onDecision: (id: string, decision: "approved" | "rejected") => void }) {
  const isPending = approval.status === "pending";
  return (
    <div className="rounded-[0.85rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.1)] p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className={`mt-0.5 h-4 w-4 ${approval.risk_level === "high" ? "text-red-300" : "text-amber-300"}`} />
        <div>
          <div className="line-clamp-2 text-xs font-semibold text-[var(--dobly-text)]">{approval.title}</div>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--dobly-text-muted)]">{approval.message}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.13em]">
        <span className="text-[var(--dobly-text-dim)]">{approval.risk_level}</span>
        <span className={statusTone(approval.status)}>{approval.status}</span>
      </div>
      {isPending ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => onDecision(approval.id, "approved")} disabled={Boolean(loading)} className="rounded-[0.7rem] bg-[var(--dobly-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {loading === `${approval.id}:approved` ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Approve"}
          </button>
          <button onClick={() => onDecision(approval.id, "rejected")} disabled={Boolean(loading)} className="rounded-[0.7rem] border border-[var(--dobly-border)] px-3 py-2 text-xs font-semibold text-[var(--dobly-text)] disabled:opacity-50">
            {loading === `${approval.id}:rejected` ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Reject"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactItem({ artifact, onPreview }: { artifact: JsonRecord; onPreview: () => void }) {
  const Icon = artifactIcon(artifact);
  return (
    <div className="rounded-[0.85rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.1)] p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.75rem] bg-[rgba(196,80,26,0.14)] text-[var(--dobly-accent)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="line-clamp-2 text-xs font-semibold text-[var(--dobly-text)]">{artifact.title}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[var(--dobly-text-dim)]">{artifact.kind} v{artifact.version}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={onPreview} className="inline-flex flex-1 items-center justify-center gap-1 rounded-[0.65rem] border border-[var(--dobly-border)] px-2 py-2 text-xs text-[var(--dobly-text)]">
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        {artifact.external_url ? (
          <a href={artifact.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-[0.65rem] border border-[var(--dobly-border)] px-2 py-2 text-xs text-[var(--dobly-text)]">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <button disabled className="inline-flex items-center justify-center rounded-[0.65rem] border border-[var(--dobly-border)] px-2 py-2 text-xs text-[var(--dobly-text-dim)] opacity-60">
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function RunItem({ run }: { run: JsonRecord }) {
  return (
    <div className="rounded-[0.85rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.1)] p-3">
      <div className="line-clamp-2 text-xs font-semibold text-[var(--dobly-text)]">{run.task ?? "Operator run"}</div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{run.summary ?? "Waiting for worker output."}</p>
      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.13em]">
        <span className="text-[var(--dobly-text-dim)]">{formatTime(run.created_at)}</span>
        <span className={statusTone(run.status)}>{run.status}</span>
      </div>
    </div>
  );
}

function EventItem({ event }: { event: JsonRecord }) {
  const tone = event.severity === "danger"
    ? "text-red-300"
    : event.severity === "warning"
    ? "text-amber-300"
    : event.severity === "success"
    ? "text-emerald-300"
    : "text-[var(--dobly-text-muted)]";
  return (
    <div className="rounded-[0.85rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.1)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="line-clamp-2 text-xs font-semibold text-[var(--dobly-text)]">{event.title}</div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{event.summary}</p>
        </div>
        <span className={tone}>{event.severity}</span>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.13em] text-[var(--dobly-text-dim)]">{String(event.event_type ?? "").replaceAll("_", " ")}</div>
    </div>
  );
}

function SideMini({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-[0.75rem] border border-[var(--dobly-border)] bg-[rgba(0,0,0,0.1)] p-2">
      <div className="line-clamp-1 text-xs font-semibold text-[var(--dobly-text)]">{title}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[var(--dobly-text-dim)]">{meta}</div>
    </div>
  );
}

function ArtifactPreviewModal({ artifact, onClose }: { artifact: JsonRecord; onClose: () => void }) {
  const previewType = artifactPreviewType(artifact);
  const url = artifact.external_url;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[1.2rem] border border-[var(--dobly-border)] bg-[var(--dobly-bg)] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--dobly-border)] p-4">
          <div>
            <div className="text-sm font-semibold text-[var(--dobly-text)]">{artifact.title}</div>
            <div className="mt-1 text-xs text-[var(--dobly-text-muted)]">{artifact.kind} artifact, version {artifact.version}</div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--dobly-border)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">
          {url && previewType === "image" ? <img src={url} alt={artifact.title} className="mx-auto max-h-[64vh] rounded-[1rem] object-contain" /> : null}
          {url && previewType === "video" ? <video src={url} controls className="mx-auto max-h-[64vh] w-full rounded-[1rem]" /> : null}
          {url && previewType === "pdf" ? <iframe src={url} className="h-[64vh] w-full rounded-[1rem] border border-[var(--dobly-border)]" /> : null}
          {!url || previewType === "file" ? (
            <div className="rounded-[1rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.025)] p-4">
              <p className="text-sm leading-7 text-[var(--dobly-text-secondary)]">
                This artifact is stored in Dobly storage or as structured content. It is attached to the coworker chat and available to the runtime for revision, sending, publishing, analysis, or conversion.
              </p>
              <pre className="mt-4 max-h-[44vh] overflow-auto rounded-[0.9rem] bg-black/20 p-4 text-xs leading-5 text-[var(--dobly-text-muted)]">{JSON.stringify(artifact.content ?? artifact.metadata ?? artifact, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
