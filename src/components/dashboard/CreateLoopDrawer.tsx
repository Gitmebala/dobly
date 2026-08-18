"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Github, Loader2, Plus, Webhook } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type CoworkerOption = { id: string; name: string };
type EventSourceValue = "webhook" | "github" | "slack" | "email";

const CADENCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "market_open", label: "At market open" },
  { value: "always_on", label: "Continuously" },
];

const EVENT_SOURCES: Array<{ value: EventSourceValue; label: string; hint: string; available: boolean }> = [
  {
    value: "webhook",
    label: "Incoming webhook",
    hint: "Dobly gives you a link. Paste it into Zapier, Make, Stripe, or anything that can send one.",
    available: true,
  },
  {
    value: "github",
    label: "GitHub repo event",
    hint: "Push, pull request, issue — anything that happens in a repo you name.",
    available: true,
  },
  {
    value: "slack",
    label: "New Slack message",
    hint: "Needs a one-time setup in your Slack app settings.",
    available: false,
  },
  {
    value: "email",
    label: "New email arrives",
    hint: "Coming soon.",
    available: false,
  },
];

export function CreateLoopDrawer({ coworkers }: { coworkers: CoworkerOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Mirrors the existing ?create=true pattern used by /dashboard/coworkers
  // and /dashboard/tasks, so the command palette's "Create a loop" entry
  // (workspace-search-index.ts) can deep-link straight into this drawer
  // instead of just landing on the page and leaving the user to find the
  // button themselves.
  useEffect(() => {
    if (searchParams.get("create") === "true") setOpen(true);
  }, [searchParams]);
  const [operatorId, setOperatorId] = useState(coworkers[0]?.id ?? "");
  const [mode, setMode] = useState<"schedule" | "webhook">("webhook");
  const [source, setSource] = useState<EventSourceValue>("webhook");
  const [repoLabel, setRepoLabel] = useState("");
  const [cadence, setCadence] = useState("daily");
  const [name, setName] = useState("");
  const [playbook, setPlaybook] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ webhookUrl: string | null; githubWebhookUrl: string | null; githubSecret: string | null } | null>(null);
  const [copiedField, setCopiedField] = useState<"url" | "secret" | null>(null);

  function resetAndClose() {
    setOpen(false);
    setTimeout(() => {
      setName("");
      setPlaybook("");
      setRepoLabel("");
      setError(null);
      setCreated(null);
      setMode("webhook");
      setSource("webhook");
      setCadence("daily");
    }, 200);
  }

  async function handleSubmit() {
    if (!operatorId) { setError("Pick which coworker owns this loop."); return; }
    if (!name.trim()) { setError("Give this loop a short name."); return; }
    if (!playbook.trim()) { setError("Describe what should happen when it runs."); return; }
    if (mode === "webhook" && source === "github" && !repoLabel.trim()) {
      setError("Name the repo, e.g. yourname/yourrepo.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "schedule"
          ? { kind: "schedule", name: name.trim(), playbook: playbook.trim(), cadence }
          : source === "github"
            ? { kind: "github_repo", name: name.trim(), playbook: playbook.trim(), repoLabel: repoLabel.trim() }
            : { kind: "webhook", name: name.trim(), playbook: playbook.trim(), eventSourceLabel: "an incoming webhook" };

      const res = await fetch(`/api/operators/${operatorId}/loops`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create this loop.");

      setCreated({
        webhookUrl: data.webhookUrl ?? null,
        githubWebhookUrl: data.githubWebhookUrl ?? null,
        githubSecret: data.githubSecret ?? null,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyValue(value: string, field: "url" | "secret") {
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <SheetTrigger asChild>
        <button type="button" className="ref-button">
          <Plus className="h-4 w-4" />
          New loop
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="loop-drawer">
        {created ? (
          <>
            <SheetHeader>
              <SheetTitle>Loop created</SheetTitle>
              <SheetDescription>
                {created.webhookUrl || created.githubWebhookUrl
                  ? "Save these now — you won't see the full version again."
                  : "This loop will run on the schedule you picked."}
              </SheetDescription>
            </SheetHeader>
            <SheetBody>
              {created.webhookUrl ? (
                <div className="loop-drawer-reveal">
                  <div className="loop-drawer-reveal-icon"><Webhook className="h-4 w-4" /></div>
                  <code className="loop-drawer-url">{created.webhookUrl}</code>
                  <button type="button" className="ref-button loop-drawer-copy" onClick={() => copyValue(created.webhookUrl!, "url")}>
                    {copiedField === "url" ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy link</>}
                  </button>
                  <p className="loop-drawer-reveal-note">
                    Paste this into whatever should wake this coworker up — Zapier, Make, Stripe, anything
                    that can send one request. If you lose it, you can make a new one from this loop's
                    menu — the old link stops working the moment you do.
                  </p>
                </div>
              ) : null}
              {created.githubWebhookUrl && created.githubSecret ? (
                <div className="loop-drawer-reveal">
                  <div className="loop-drawer-reveal-icon"><Github className="h-4 w-4" /></div>
                  <label className="loop-drawer-label">
                    Payload URL — paste into your repo's Settings → Webhooks
                    <code className="loop-drawer-url">{created.githubWebhookUrl}</code>
                  </label>
                  <button type="button" className="ref-button loop-drawer-copy" onClick={() => copyValue(created.githubWebhookUrl!, "url")}>
                    {copiedField === "url" ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy URL</>}
                  </button>
                  <label className="loop-drawer-label" style={{ marginTop: 10 }}>
                    Secret — paste into the same webhook's "Secret" field
                    <code className="loop-drawer-url">{created.githubSecret}</code>
                  </label>
                  <button type="button" className="ref-button loop-drawer-copy" onClick={() => copyValue(created.githubSecret!, "secret")}>
                    {copiedField === "secret" ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy secret</>}
                  </button>
                  <p className="loop-drawer-reveal-note">
                    In your GitHub repo: Settings → Webhooks → Add webhook. Content type: application/json.
                    Pick which events to send, or leave "Just the push event" for the default. If you lose
                    the secret, make a new one from this loop's menu — the old one stops working immediately.
                  </p>
                </div>
              ) : null}
            </SheetBody>
            <SheetFooter>
              <button type="button" className="ref-button" onClick={resetAndClose}>Done</button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>New loop</SheetTitle>
              <SheetDescription>Something your coworker does again and again, without you asking each time.</SheetDescription>
            </SheetHeader>
            <SheetBody className="loop-drawer-body">
              <label className="loop-drawer-label">
                Which coworker
                <select
                  className="ref-input loop-drawer-select"
                  value={operatorId}
                  onChange={(event) => setOperatorId(event.target.value)}
                >
                  {coworkers.map((coworker) => (
                    <option key={coworker.id} value={coworker.id}>{coworker.name}</option>
                  ))}
                </select>
              </label>

              <div className="loop-drawer-segmented" role="tablist" aria-label="When this runs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "webhook"}
                  data-active={mode === "webhook"}
                  onClick={() => setMode("webhook")}
                >
                  When something happens
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "schedule"}
                  data-active={mode === "schedule"}
                  onClick={() => setMode("schedule")}
                >
                  On a schedule
                </button>
              </div>

              {mode === "schedule" ? (
                <label className="loop-drawer-label">
                  How often
                  <select className="ref-input loop-drawer-select" value={cadence} onChange={(event) => setCadence(event.target.value)}>
                    {CADENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="loop-drawer-label">
                  What triggers it
                  <RadioGroup
                    value={source}
                    onValueChange={(value) => setSource(value as EventSourceValue)}
                    className="loop-drawer-sources"
                  >
                    {EVENT_SOURCES.map((option) => (
                      <label key={option.value} className="loop-drawer-source" data-disabled={!option.available}>
                        <RadioGroupItem value={option.value} disabled={!option.available} />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.hint}</small>
                        </span>
                        {!option.available ? <em className="loop-drawer-soon">Soon</em> : null}
                      </label>
                    ))}
                  </RadioGroup>
                  {source === "github" ? (
                    <input
                      className="ref-input"
                      style={{ marginTop: 10 }}
                      value={repoLabel}
                      onChange={(event) => setRepoLabel(event.target.value)}
                      placeholder="yourname/yourrepo"
                      maxLength={140}
                    />
                  ) : null}
                </div>
              )}

              <label className="loop-drawer-label">
                Name
                <input
                  className="ref-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. New order alert"
                  maxLength={120}
                />
              </label>

              <label className="loop-drawer-label">
                What should happen
                <textarea
                  className="ref-input ref-textarea"
                  value={playbook}
                  onChange={(event) => setPlaybook(event.target.value)}
                  placeholder="e.g. Read the order details, check if it's a repeat customer, and post a short summary in the chat."
                  maxLength={2000}
                />
              </label>

              {error ? <p className="loop-drawer-error">{error}</p> : null}
            </SheetBody>
            <SheetFooter>
              <button type="button" className="ref-button loop-drawer-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create loop"}
              </button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
