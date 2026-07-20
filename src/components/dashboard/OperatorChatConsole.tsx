"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarDays,
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
    kind?: string;
    approval_mode: string;
    capability_tags: string[];
    guardrails?: JsonRecord;
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

// The Leash: how much run the coworker has, in plain language.
const leashModes = [
  { value: "supervised", label: "watch only", copy: "Reads everything, writes nothing. Good for the first week." },
  { value: "ask_first", label: "draft, then ask", copy: "Prepares the work and holds it. Nothing leaves without your tap." },
  { value: "approve_risky", label: "act, then notify", copy: "Handles routine work alone. Risky moves still come to you first." },
  { value: "trusted", label: "autonomous", copy: "Full run of the job. Guardrails still hard-stop it." },
] as const;

function guardrailPills(guardrails?: JsonRecord): Array<{ label: string; tone: string }> {
  if (!guardrails) return [];
  const pills: Array<{ label: string; tone: string }> = [];
  for (const [key, value] of Object.entries(guardrails)) {
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 4)) {
        if (typeof item === "string" && item.length < 48) pills.push({ label: item.toLowerCase(), tone: "danger" });
      }
    } else if (typeof value === "string" && value.length < 48) {
      pills.push({ label: value.toLowerCase(), tone: "warning" });
    } else if (value === true) {
      pills.push({ label: key.replace(/_/g, " ").toLowerCase(), tone: "warning" });
    }
  }
  return pills.slice(0, 6);
}

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

function heldFor(value?: string | null) {
  if (!value) return "just now";
  const minutes = Math.max(1, Math.round((Date.now() - Date.parse(value)) / 60000));
  if (minutes < 60) return `held ${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `held ${hours}h` : `held ${Math.round(hours / 24)}d`;
}

function formatClock(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(date);
}

type TimelineEntry =
  | { kind: "message"; at: string; message: ChatMessage }
  | { kind: "event"; at: string; event: JsonRecord };

type TimelineGroup = { day: string; label: string; entries: TimelineEntry[] };

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
  const [dateFilter, setDateFilter] = useState("");
  const [leash, setLeash] = useState(() => {
    const index = leashModes.findIndex((mode) => mode.value === props.operator.approval_mode);
    return index === -1 ? 1 : index;
  });
  const [leashSaving, setLeashSaving] = useState(false);
  const [rails, setRails] = useState<string[]>(() =>
    Array.isArray(props.operator.guardrails?.rules)
      ? (props.operator.guardrails.rules as unknown[]).filter((rule): rule is string => typeof rule === "string")
      : [],
  );
  const [newRail, setNewRail] = useState("");
  const [railsSaving, setRailsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function saveRails(next: string[]) {
    const previous = rails;
    setRails(next);
    setRailsSaving(true);
    try {
      const response = await fetch(`/api/operators/${props.operator.id}/guardrails`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rules: next }),
      });
      if (!response.ok) {
        setRails(previous);
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not update guardrails.");
      }
    } catch {
      setRails(previous);
      setError("Could not update guardrails.");
    } finally {
      setRailsSaving(false);
    }
  }

  async function updateLeash(nextIndex: number) {
    const previous = leash;
    setLeash(nextIndex);
    setLeashSaving(true);
    try {
      const response = await fetch(`/api/operators/${props.operator.id}/leash`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvalMode: leashModes[nextIndex].value }),
      });
      if (!response.ok) {
        setLeash(previous);
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not change autonomy.");
      }
    } catch {
      setLeash(previous);
      setError("Could not change autonomy.");
    } finally {
      setLeashSaving(false);
    }
  }

  const pendingApprovals = useMemo(
    () => approvals.filter((approval) => approval.status === "pending"),
    [approvals],
  );

  // Everything the coworker does — messages and work events — merged into
  // one chronological record, grouped by day, filterable to a single date.
  const timeline = useMemo<TimelineGroup[]>(() => {
    const messageEntries: TimelineEntry[] = messages
      .filter((message) => message.created_at)
      .map((message) => ({ kind: "message", at: message.created_at, message }));
    const eventEntries: TimelineEntry[] = props.events
      .filter((event) => event.created_at)
      .map((event) => ({ kind: "event", at: String(event.created_at), event }));
    const all = [...messageEntries, ...eventEntries].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const visible = dateFilter ? all.filter((entry) => dayKey(entry.at) === dateFilter) : all;
    const groups: TimelineGroup[] = [];
    for (const entry of visible) {
      const key = dayKey(entry.at);
      const last = groups[groups.length - 1];
      if (last && last.day === key) last.entries.push(entry);
      else groups.push({ day: key, label: formatDayLabel(entry.at), entries: [entry] });
    }
    return groups;
  }, [messages, props.events, dateFilter]);

  useEffect(() => {
    // Open the conversation at the most recent moment, like returning to a desk.
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, []);

  useEffect(() => {
    if (dateFilter) listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [dateFilter]);
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
          <div className="console-head">
            <div className="console-identity">
              <span className="console-tile" aria-hidden="true">{props.operator.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <div className="console-name-row">
                  <strong>{props.operator.name}</strong>
                  <code>#{props.operator.id.slice(0, 4)} · {props.operator.kind ?? "custom"}</code>
                </div>
                <p>{props.operator.mission}</p>
              </div>
            </div>
            <div className="console-presence">
              <span className="console-presence-state" data-status={props.operator.status}>
                <i aria-hidden="true" />
                {props.operator.status === "active" ? "On shift" : props.operator.status}
              </span>
              <code>last active {formatTime(props.operator.last_run_at).toLowerCase()}</code>
              <button type="button" className="operator-details-button" onClick={() => setInspectorOpen(true)}>
                <PanelRightOpen aria-hidden="true" />
                Details
                {pendingApprovals.length ? <strong>{pendingApprovals.length}</strong> : null}
              </button>
            </div>
          </div>

          <div className="console-stats" aria-label="Today at a glance">
            <div><code>handled</code><b>{props.recentRuns.length}</b></div>
            <div><code>outputs</code><b>{artifacts.length}</b></div>
            <div data-tone={pendingApprovals.length ? "warning" : undefined}><code>waiting on you</code><b>{pendingApprovals.length}</b></div>
            <div><code>loops</code><b>{props.operator.loops.filter((loop) => loop.status === "active").length}</b></div>
          </div>

          <div className="console-leash">
            <div className="console-leash-head">
              <span>Leash</span>
              <code>{leashSaving ? "saving…" : leashModes[leash].label}</code>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={leash}
              onChange={(event) => updateLeash(Number(event.target.value))}
              aria-label="Autonomy level"
              style={{ "--leash-pct": `${(leash / 3) * 100}%` } as React.CSSProperties}
            />
            <div className="console-leash-stops" aria-hidden="true">
              {leashModes.map((mode) => <span key={mode.value}>{mode.label.split(",")[0]}</span>)}
            </div>
            <p>{leashModes[leash].copy}</p>
          </div>

          {guardrailPills({ ...props.operator.guardrails, rules: rails }).length ? (
            <div className="console-rails">
              <div className="console-rails-head">
                <span>Guardrails</span>
                <code>{guardrailPills({ ...props.operator.guardrails, rules: rails }).length} rules · edit in details</code>
              </div>
              <div className="console-rails-pills">
                {guardrailPills({ ...props.operator.guardrails, rules: rails }).map((pill) => (
                  <span key={pill.label} data-tone={pill.tone}>{pill.label}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="operator-thread-controls">
            <span className="operator-thread-controls-label">
              <CalendarDays aria-hidden="true" />
              Shift tape
              <code>{dateFilter ? formatDayLabel(`${dateFilter}T12:00:00`).toLowerCase() : "full history"}</code>
            </span>
            <div className="operator-thread-controls-actions">
              <input
                type="date"
                value={dateFilter}
                max={dayKey(new Date().toISOString())}
                onChange={(event) => setDateFilter(event.target.value)}
                aria-label="View what this coworker did on a specific day"
              />
              {dateFilter ? (
                <button type="button" onClick={() => setDateFilter("")}>Show everything</button>
              ) : null}
            </div>
          </div>

          <div ref={listRef} className="operator-chat-thread">
            {timeline.map((group) => (
              <div key={group.day} className="operator-thread-day">
                <div className="operator-day-divider" role="separator" aria-label={group.label}>
                  <span>{group.label}</span>
                </div>
                {group.entries.map((entry) =>
                  entry.kind === "message"
                    ? <MessageBubble key={entry.message.id} message={entry.message} coworkerName={props.operator.name} />
                    : <ActivityRow key={`event-${entry.event.id}`} event={entry.event} />
                )}
              </div>
            ))}
            {!timeline.length ? (
              <div className="operator-thread-empty">
                <Bot aria-hidden="true" />
                <strong>{dateFilter ? "Nothing happened on this day" : "No conversation yet"}</strong>
                <span>{dateFilter ? "Pick another date, or show everything." : `Say hello — tell ${props.operator.name} what you need.`}</span>
              </div>
            ) : null}
            {pendingApprovals.length ? (
              <div className="tape-held" aria-label="Work held for your decision">
                {pendingApprovals.slice(0, 3).map((approval) => (
                  <div key={approval.id} className="tape-held-item">
                    <i aria-hidden="true" />
                    <div className="tape-held-copy">
                      <strong>{approval.title || approval.message}</strong>
                      <div className="tape-held-actions">
                        <button type="button" onClick={() => decideApproval(approval.id, "approved")} disabled={Boolean(decisionLoading)} data-primary>
                          {decisionLoading === `${approval.id}:approved` ? "…" : "Approve"}
                        </button>
                        <button type="button" onClick={() => decideApproval(approval.id, "rejected")} disabled={Boolean(decisionLoading)}>
                          {decisionLoading === `${approval.id}:rejected` ? "…" : "Not this"}
                        </button>
                        <button type="button" onClick={() => setInspectorOpen(true)}>Read it ↗</button>
                        <code>{heldFor(approval.requested_at)}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {isPending ? (
              <div className="operator-typing" aria-live="polite">
                <span className="operator-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                {props.operator.name} is thinking — planning the work, checking risk, choosing tools...
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
                placeholder={`Tell ${props.operator.name} what changed…`}
                className="ledger-composer-input"
              />
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                <input
                  value={attachmentNote}
                  onChange={(event) => setAttachmentNote(event.target.value)}
                  placeholder="Optional note for attached image, doc, video, CAD file, or reference..."
                  className="ledger-composer-note"
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
            {error ? <p className="ledger-composer-error" role="alert">{error}</p> : null}
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
              <>
                <ControlCard icon={ShieldCheck} title="Guardrails" value={railsSaving ? "saving…" : `${rails.length} rules`}>
                  <div className="rails-editor">
                    {rails.map((rule, index) => (
                      <div key={`${rule}-${index}`} className="rails-editor-row">
                        <span>{rule}</span>
                        <button type="button" onClick={() => saveRails(rails.filter((_, i) => i !== index))} disabled={railsSaving} aria-label={`Remove rule: ${rule}`}>
                          <X aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    {!rails.length ? <p>No hard rules yet. Anything you add here always stops the coworker for your decision.</p> : null}
                    <form
                      className="rails-editor-add"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const value = newRail.trim();
                        if (value.length < 2 || rails.length >= 12) return;
                        saveRails([...rails, value]);
                        setNewRail("");
                      }}
                    >
                      <input
                        value={newRail}
                        onChange={(event) => setNewRail(event.target.value)}
                        placeholder="e.g. refunds over $50"
                        maxLength={80}
                        aria-label="Add a hard rule"
                      />
                      <button type="submit" disabled={railsSaving || newRail.trim().length < 2}>Add rule</button>
                    </form>
                  </div>
                </ControlCard>
                <ControlCard icon={Clock3} title="Loops" value={`${props.operator.loops.length}`}>
                  {props.operator.loops.map((loop) => (
                    <div key={loop.id} className="loop-row" data-status={loop.status}>
                      <div>
                        <strong>{loop.name}</strong>
                        <p>{loop.trigger}</p>
                      </div>
                      <code>{loop.cadence.replace(/_/g, " ")} · {loop.status}</code>
                    </div>
                  ))}
                  {!props.operator.loops.length ? <p>No loops yet. Loops are the recurring jobs this coworker runs on its own.</p> : null}
                </ControlCard>
                <ControlCard icon={Sparkles} title="Steer this coworker" value="Commands">
                  {operatorControlPrompts.map((item) => <button key={item} onClick={() => sendPrompt(item)} className="operator-control-prompt">{item}</button>)}
                </ControlCard>
              </>
            ) : null}
          </div>
        </aside>
      </div>

      {activeArtifact ? <ArtifactPreviewModal artifact={activeArtifact} onClose={() => setActiveArtifact(null)} /> : null}
    </section>
  );
}

function ActivityRow({ event }: { event: JsonRecord }) {
  const severity = String(event.severity ?? "info");
  return (
    <div className="operator-activity-row" data-severity={severity}>
      <i aria-hidden="true" />
      <div className="operator-activity-copy">
        <strong>{String(event.title ?? "Activity")}</strong>
        {event.summary ? <p>{String(event.summary)}</p> : null}
      </div>
      <time dateTime={String(event.created_at ?? "")}>{formatClock(String(event.created_at ?? ""))}</time>
    </div>
  );
}

function MessageBubble({ message, coworkerName }: { message: ChatMessage; coworkerName: string }) {
  const isUser = message.role === "user";
  const author = isUser
    ? "You"
    : message.role === "operator"
    ? coworkerName
    : message.role === "approval"
    ? "Decision"
    : message.role === "system"
    ? "Dobly"
    : message.role;
  const showIntent = message.intent && !["instruction", "message", "reply"].includes(message.intent);

  return (
    <article className={`ledger-entry ${isUser ? "ledger-entry-user" : "ledger-entry-coworker"}`} data-role={message.role}>
      <header className="ledger-entry-meta">
        <strong>{author}</strong>
        {showIntent ? <span>{message.intent.replace(/_/g, " ")}</span> : null}
        <time dateTime={message.created_at}>{formatClock(message.created_at)}</time>
      </header>
      <div className="ledger-entry-body">{message.body}</div>
      <OperatorThinking message={message} />
      <MessageArtifactPreview message={message} />
    </article>
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
    <details className="ledger-workings">
      <summary>How this was worked out</summary>
      <div className="ledger-workings-body">
        {plan.length ? (
          <ol className="ledger-plan">
            {plan.slice(0, 8).map((step: JsonRecord, index: number) => (
              <li key={step.id ?? index}>
                <strong>{step.title ?? `Step ${index + 1}`}</strong>
                {step.purpose ?? step.expectedOutput ? <p>{step.purpose ?? step.expectedOutput}</p> : null}
                <small>
                  {step.phase ?? "plan"} · {step.toolPreference ?? "tool judgment"} · {step.requiresApproval ? "needs approval" : "safe to continue"}
                </small>
              </li>
            ))}
          </ol>
        ) : null}
        {autonomy ? <InfoBlock title="Autonomy" data={autonomy} /> : null}
        {risk ? <InfoBlock title="Risk" data={risk} /> : null}
        {missingInfo ? <InfoBlock title="Missing info" data={missingInfo} /> : null}
        {message.job_id || message.brain_trace_id ? (
          <p className="ledger-workings-refs">
            {message.job_id ? <>Job <code>{message.job_id.slice(0, 8)}</code></> : null}
            {message.brain_trace_id ? <> · Trace <code>{message.brain_trace_id.slice(0, 8)}</code></> : null}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function MessageArtifactPreview({ message }: { message: ChatMessage }) {
  const artifact = message.metadata?.artifact;
  if (!artifact) return null;
  const Icon = artifactIcon(artifact);
  return (
    <div className="ledger-attachment">
      <span aria-hidden="true"><Icon /></span>
      <div>
        <strong>{artifact.title}</strong>
        <small>{artifact.kind} · version {artifact.version}</small>
      </div>
    </div>
  );
}

function InfoBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="ledger-info-block">
      <span>{title}</span>
      <pre>{JSON.stringify(data, null, 2)}</pre>
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
