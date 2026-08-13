"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mail,
  Megaphone,
  MessageCircle,
  Phone,
  Plug,
  Search,
  Send,
  X,
} from "lucide-react";
import type {
  BusinessChannelConnectionRecord,
  BusinessChannelDefinition,
  BusinessChannelId,
  BusinessChannelStatus,
} from "@/lib/business-channels";

const CHANNEL_ICONS: Record<BusinessChannelId, typeof Phone> = {
  business_phone: Phone,
  business_sms: Send,
  whatsapp_business: MessageCircle,
  business_email: Mail,
  website_chat: MessageCircle,
  calendar: CheckCircle2,
  crm: Plug,
  content_tools: Megaphone,
};

const STATUS_LABEL: Record<BusinessChannelStatus, string> = {
  not_connected: "Not connected",
  verification_required: "Verifying",
  approval_pending: "Pending approval",
  ready_to_test: "Ready to test",
  live: "Live",
  needs_attention: "Needs attention",
};

const STATUS_TONE: Record<BusinessChannelStatus, "green" | "amber" | "red" | "muted"> = {
  not_connected: "muted",
  verification_required: "amber",
  approval_pending: "amber",
  ready_to_test: "amber",
  live: "green",
  needs_attention: "red",
};

const OPERATOR_ROUTABLE_CAPABILITIES = new Set([
  "receive_calls",
  "receive_sms",
  "receive_whatsapp",
  "receive_chat",
]);

interface OperatorOption {
  id: string;
  name: string;
  mission: string;
}

/* Real restructure, not a copy edit. The old page kept every channel
   permanently expanded as a card, plus a permanently-open half-page
   setup form underneath - everything visible at once whether you
   needed it or not. Founder, repeatedly: "plant them like cards on a
   screen there...noooo...think of how to place everything, modals
   toolboxes popovers dropdowns." This is a status-grouped list (like
   Slack's App Directory or Linear's integration settings - you scan
   what's connected vs what needs attention, you don't browse
   descriptions of channels you already set up) with the actual setup
   form living in an on-demand slide-over instead of a permanent block.
   The panel still does exactly the one real action the backend
   supports (POST /api/business-channels) - no fake extra "steps" with
   nothing behind them; that would be the same silent-success shape
   this session spent a long time finding and removing elsewhere. */
export default function BusinessChannelsClient({
  channels,
}: {
  channels: BusinessChannelDefinition[];
}) {
  const [connections, setConnections] = useState<BusinessChannelConnectionRecord[]>([]);
  const [query, setQuery] = useState("");
  const [panelChannel, setPanelChannel] = useState<BusinessChannelDefinition | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [operatorId, setOperatorId] = useState("");
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  useEffect(() => {
    fetch("/api/operators")
      .then((response) => response.json())
      .then((data) => setOperators((data.operators ?? []).map((operator: any) => ({ id: operator.id, name: operator.name, mission: operator.mission }))))
      .catch(() => setOperators([]));
    fetch("/api/business-channels")
      .then((response) => response.json())
      .then((data) => setConnections(data.connections ?? []))
      .catch(() => setConnections([]));
  }, []);

  const connectionByChannel = useMemo(() => {
    const map = new Map<BusinessChannelId, BusinessChannelConnectionRecord>();
    // API returns newest-first; keep the first (most recent) row per channel.
    for (const connection of connections) {
      if (!map.has(connection.channel_id)) map.set(connection.channel_id, connection);
    }
    return map;
  }, [connections]);

  const filteredChannels = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return channels;
    return channels.filter(
      (channel) =>
        channel.title.toLowerCase().includes(normalized) ||
        channel.departmentFit.some((department) => department.toLowerCase().includes(normalized)),
    );
  }, [channels, query]);

  const groups = useMemo(() => {
    const connected: BusinessChannelDefinition[] = [];
    const inProgress: BusinessChannelDefinition[] = [];
    const available: BusinessChannelDefinition[] = [];
    for (const channel of filteredChannels) {
      const connection = connectionByChannel.get(channel.id);
      if (!connection) available.push(channel);
      else if (connection.status === "live") connected.push(channel);
      else inProgress.push(channel);
    }
    return { connected, inProgress, available };
  }, [filteredChannels, connectionByChannel]);

  const routesToOperator = panelChannel?.capabilities.some((capability) => OPERATOR_ROUTABLE_CAPABILITIES.has(capability)) ?? false;

  function openPanel(channel: BusinessChannelDefinition) {
    setPanelChannel(channel);
    setIdentifier("");
    setOperatorId("");
    setMessage(null);
    setHowItWorksOpen(false);
  }

  function startSetup() {
    if (!panelChannel) return;
    const channel = panelChannel;
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/business-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          displayName: channel.title,
          externalIdentifier: identifier.trim() || null,
          operatorId: routesToOperator ? operatorId || null : null,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result?.setupWarning ?? result?.error ?? "Dobly could not start this setup yet.");
        return;
      }

      setMessage(`${channel.title} setup started. Next: ${result.nextStep ?? "verify and test this channel."}`);
      if (result.connection) {
        setConnections((current) => {
          const rest = current.filter((row) => row.id !== result.connection.id);
          return [result.connection, ...rest];
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="channels-search">
        <Search className="h-4 w-4 text-[var(--dobly-text-dim)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search channels — phone, email, CRM..."
          className="channels-search-input"
        />
      </div>

      <ChannelGroup
        title="Connected"
        empty={null}
        channels={groups.connected}
        connectionByChannel={connectionByChannel}
        onOpen={openPanel}
      />
      <ChannelGroup
        title="In progress"
        empty={null}
        channels={groups.inProgress}
        connectionByChannel={connectionByChannel}
        onOpen={openPanel}
      />
      <ChannelGroup
        title="Available to connect"
        empty={query ? "No channels match that search." : null}
        channels={groups.available}
        connectionByChannel={connectionByChannel}
        onOpen={openPanel}
      />

      {panelChannel ? (
        <div className="channel-panel-scrim" onClick={() => setPanelChannel(null)}>
          <div className="channel-panel" onClick={(event) => event.stopPropagation()}>
            <div className="channel-panel-head">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">
                  {panelChannel.plainName} setup
                </div>
                <h2 className="mt-1 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">{panelChannel.title}</h2>
              </div>
              <button type="button" onClick={() => setPanelChannel(null)} className="channel-panel-close" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--dobly-text-secondary)]">{panelChannel.promise}</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {panelChannel.setupModes.map((mode) => (
                <div key={mode.id} className={`channel-mode-tile ${mode.recommended ? "is-recommended" : ""}`}>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--dobly-text)]">
                    {mode.recommended ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--dobly-accent)]" /> : null}
                    {mode.title}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--dobly-text-muted)]">{mode.summary}</p>
                </div>
              ))}
            </div>

            {routesToOperator ? (
              <div className="mt-5">
                <label className="channel-panel-label">Which coworker answers this?</label>
                <select
                  value={operatorId}
                  onChange={(event) => setOperatorId(event.target.value)}
                  className="channel-panel-input"
                >
                  <option value="">No coworker yet — general inbox only</option>
                  {operators.map((operator) => (
                    <option key={operator.id} value={operator.id}>{operator.name}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-[var(--dobly-text-muted)]">
                  {operatorId ? (
                    "Messages here will show up in this coworker's chat."
                  ) : operators.length === 0 ? (
                    <>
                      No coworkers yet —{" "}
                      <Link href="/dashboard/coworkers?create=true" className="text-[var(--dobly-accent)] underline underline-offset-2">
                        hire one
                      </Link>{" "}
                      if you want this channel to reach one by name.
                    </>
                  ) : (
                    "Without a coworker, this lands in the general office inbox."
                  )}
                </p>
              </div>
            ) : null}

            <div className="mt-5">
              <label className="channel-panel-label">Number, email, account, or tool name</label>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Example: +1 555 123 4567, hello@business.com, WhatsApp Business"
                className="channel-panel-input"
              />
            </div>

            <button
              type="button"
              onClick={startSetup}
              disabled={isPending}
              className="btn-primary mt-4 w-full justify-center"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Start setup
            </button>

            {message ? (
              <div className="mt-3 rounded-xl border border-[rgba(84,186,123,0.22)] bg-[rgba(84,186,123,0.08)] px-4 py-3 text-sm text-[var(--dobly-text-secondary)]">
                {message}
              </div>
            ) : null}

            <details className="channel-panel-how" open={howItWorksOpen} onToggle={(event) => setHowItWorksOpen((event.target as HTMLDetailsElement).open)}>
              <summary>How this connects</summary>
              <ChannelFlow userSteps={panelChannel.userSteps} doblySteps={panelChannel.doblySteps} />
            </details>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChannelGroup({
  title,
  channels,
  empty,
  connectionByChannel,
  onOpen,
}: {
  title: string;
  channels: BusinessChannelDefinition[];
  empty: string | null;
  connectionByChannel: Map<BusinessChannelId, BusinessChannelConnectionRecord>;
  onOpen: (channel: BusinessChannelDefinition) => void;
}) {
  if (channels.length === 0 && !empty) return null;
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-[var(--dobly-text)]">{title}</h2>
        <span className="text-xs text-[var(--dobly-text-dim)]">{channels.length}</span>
      </div>
      {channels.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--dobly-text-muted)]">{empty}</p>
      ) : (
        <div className="mt-3 channel-row-list">
          {channels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.id];
            const connection = connectionByChannel.get(channel.id);
            const status: BusinessChannelStatus = connection?.status ?? "not_connected";
            return (
              <button key={channel.id} type="button" onClick={() => onOpen(channel)} className="channel-row">
                <span className="channel-row-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="channel-row-main">
                  <span className="channel-row-title">{channel.title}</span>
                  <span className="channel-row-meta">{channel.departmentFit.join(", ")}</span>
                </span>
                <span className={`badge-muted text-xs channel-status-${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
                <ChevronRight className="h-4 w-4 text-[var(--dobly-text-dim)]" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* A single connected flow instead of two side-by-side "what the user
   does / what Dobly does" spec cards - that split read like an internal
   responsibility matrix, not something a real user needed to see broken
   out. This interleaves the same two step lists into one back-and-forth
   ("you do this, Dobly handles that") the way the setup actually
   happens, tagged inline rather than duplicated into a parallel column. */
function ChannelFlow({ userSteps, doblySteps }: { userSteps: string[]; doblySteps: string[] }) {
  const rows: Array<{ who: "you" | "dobly"; text: string }> = [];
  const max = Math.max(userSteps.length, doblySteps.length);
  for (let index = 0; index < max; index += 1) {
    if (userSteps[index]) rows.push({ who: "you", text: userSteps[index] });
    if (doblySteps[index]) rows.push({ who: "dobly", text: doblySteps[index] });
  }
  return (
    <div className="mt-3 channel-flow">
      {rows.map((row, index) => (
        <div key={index} className="channel-flow-row" data-who={row.who}>
          <span className="channel-flow-tag">{row.who === "you" ? "You" : "Dobly"}</span>
          <p>{row.text}</p>
        </div>
      ))}
    </div>
  );
}
