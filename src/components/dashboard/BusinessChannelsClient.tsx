"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Megaphone,
  MessageCircle,
  Phone,
  Plug,
  Send,
  Sparkles,
} from "lucide-react";
import type {
  BusinessChannelDefinition,
  BusinessChannelId,
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

export default function BusinessChannelsClient({
  channels,
}: {
  channels: BusinessChannelDefinition[];
}) {
  const [activeChannel, setActiveChannel] = useState<BusinessChannelDefinition | null>(channels[0] ?? null);
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startSetup(channel: BusinessChannelDefinition) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/business-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          displayName: channel.title,
          externalIdentifier: identifier.trim() || null,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result?.setupWarning ?? result?.error ?? "Dobly could not start this setup yet.");
        return;
      }

      setMessage(`${channel.title} setup started. Next: ${result.nextStep ?? "verify and test this channel."}`);
      setIdentifier("");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="card h-fit">
        <div className="badge-muted text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          Business ecosystem
        </div>
        <h2 className="mt-4 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">
          Connect the channels Dobly will operate through.
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--dobly-text-secondary)]">
          The user sees connect, verify, test, activate. Dobly handles routing, webhooks, permissions, compliance,
          memory, and department worker setup underneath.
        </p>

        <div className="mt-5 space-y-2">
          {channels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.id];
            const selected = activeChannel?.id === channel.id;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => {
                  setActiveChannel(channel);
                  setMessage(null);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-[rgba(196,80,26,0.36)] bg-[rgba(196,80,26,0.12)]"
                    : "border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] hover:border-[rgba(242,232,220,0.18)]"
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(196,80,26,0.12)] text-[var(--dobly-accent)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-[var(--dobly-text)]">{channel.title}</span>
                  <span className="text-xs text-[var(--dobly-text-muted)]">{channel.departmentFit.join(", ")}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {activeChannel ? (
        <section className="space-y-5">
          <div className="card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">
                  {activeChannel.plainName} setup
                </div>
                <h1 className="mt-2 font-display text-4xl tracking-[-0.06em] text-[var(--dobly-text)]">
                  {activeChannel.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
                  {activeChannel.promise}
                </p>
              </div>
              <span className="badge-muted text-xs">Connect. Verify. Test. Activate.</span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {activeChannel.setupModes.map((mode) => (
                <div
                  key={mode.id}
                  className={`rounded-2xl border p-4 ${
                    mode.recommended
                      ? "border-[rgba(196,80,26,0.32)] bg-[rgba(196,80,26,0.1)]"
                      : "border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--dobly-text)]">
                    {mode.recommended ? <CheckCircle2 className="h-4 w-4 text-[var(--dobly-accent)]" /> : null}
                    {mode.title}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-muted)]">{mode.summary}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(0,0,0,0.14)] p-4">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
                Number, email, account, or tool name
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Example: +1 555 123 4567, hello@business.com, WhatsApp Business"
                  className="min-h-[48px] flex-1 rounded-xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] px-4 text-sm text-[var(--dobly-text)] outline-none placeholder:text-[var(--dobly-text-dim)]"
                />
                <button
                  type="button"
                  onClick={() => startSetup(activeChannel)}
                  disabled={isPending}
                  className="btn-primary min-h-[48px] justify-center whitespace-nowrap"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Start setup
                </button>
              </div>
              {message ? (
                <div className="mt-3 rounded-xl border border-[rgba(84,186,123,0.22)] bg-[rgba(84,186,123,0.08)] px-4 py-3 text-sm text-[var(--dobly-text-secondary)]">
                  {message}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ProcessCard title="What the user does" steps={activeChannel.userSteps} />
            <ProcessCard title="What Dobly does" steps={activeChannel.doblySteps} dobly />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProcessCard({
  title,
  steps,
  dobly = false,
}: {
  title: string;
  steps: string[];
  dobly?: boolean;
}) {
  return (
    <div className="card">
      <h2 className="font-display text-xl text-[var(--dobly-text)]">{title}</h2>
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <div key={step} className="flex gap-3 rounded-2xl border border-[rgba(242,232,220,0.07)] bg-[rgba(255,255,255,0.025)] p-3">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                dobly ? "bg-[rgba(94,184,255,0.12)] text-[rgb(94,184,255)]" : "bg-[rgba(196,80,26,0.13)] text-[var(--dobly-accent)]"
              }`}
            >
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-[var(--dobly-text-secondary)]">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
