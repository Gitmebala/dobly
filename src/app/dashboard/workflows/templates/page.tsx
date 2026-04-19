"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Filter,
  GitBranch,
  PlayCircle,
  Sparkles,
  Workflow,
} from "lucide-react";

type TemplateKind = "agent" | "automation";

type Template = {
  id: string;
  title: string;
  kind: TemplateKind;
  lane: string;
  summary: string;
  outcome: string;
  connectionBurden: "Low" | "Medium";
  steps: string[];
  prompt: string;
};

const TEMPLATES: Template[] = [
  {
    id: "lead-qualifier",
    title: "Inbound lead qualifier",
    kind: "agent",
    lane: "Sales and intake",
    summary: "Screens new prospects, asks the next question, and routes strong leads to the right human.",
    outcome: "Turn raw inbound interest into a clean, prioritized handoff.",
    connectionBurden: "Low",
    steps: ["Receive inquiry", "Ask qualification questions", "Score urgency", "Route or escalate"],
    prompt: "Build an agent that qualifies inbound leads, asks follow-up questions, and routes high-intent prospects to sales.",
  },
  {
    id: "support-triage",
    title: "Support triage agent",
    kind: "agent",
    lane: "Support and service",
    summary: "Handles common questions, gathers missing context, and escalates complex issues cleanly.",
    outcome: "Reduce repetitive support work without losing control.",
    connectionBurden: "Low",
    steps: ["Receive request", "Identify issue type", "Answer common cases", "Escalate exceptions"],
    prompt: "Build a support triage agent that answers common questions and escalates complex issues to a human.",
  },
  {
    id: "invoice-followup",
    title: "Invoice follow-up automation",
    kind: "automation",
    lane: "Commerce and billing",
    summary: "Tracks due dates, sends reminders, and escalates unpaid invoices for review.",
    outcome: "Keep collections moving without manual chasing.",
    connectionBurden: "Medium",
    steps: ["Check due status", "Send reminder", "Wait", "Escalate overdue accounts"],
    prompt: "Build an automation that follows up on unpaid invoices, sends reminders, and escalates overdue accounts.",
  },
  {
    id: "daily-report",
    title: "Daily operating report",
    kind: "automation",
    lane: "Operations and admin",
    summary: "Collects workflow output, summarizes the day, and prepares an executive-ready brief.",
    outcome: "Give the team one calm, consistent operating summary.",
    connectionBurden: "Low",
    steps: ["Collect data", "Assemble summary", "Highlight anomalies", "Deliver report"],
    prompt: "Build an automation that compiles a daily business summary, highlights anomalies, and sends a report.",
  },
  {
    id: "booking-reminder",
    title: "Booking reminder system",
    kind: "automation",
    lane: "Support and service",
    summary: "Schedules confirmations and reminders before appointments, then records follow-through.",
    outcome: "Reduce missed appointments and last-minute confusion.",
    connectionBurden: "Medium",
    steps: ["Watch new booking", "Confirm details", "Send reminder", "Flag no-shows or reschedules"],
    prompt: "Build an automation that sends confirmations and reminders for booked appointments and flags no-shows.",
  },
  {
    id: "ops-concierge",
    title: "Internal ops concierge",
    kind: "agent",
    lane: "Operations and admin",
    summary: "Handles recurring internal requests, prepares next actions, and keeps handoffs structured.",
    outcome: "Move routine internal operations out of chat chaos.",
    connectionBurden: "Low",
    steps: ["Receive request", "Classify work", "Prepare next action", "Route or escalate"],
    prompt: "Build an internal operations concierge agent that handles recurring requests, drafts next actions, and routes work to the right owner.",
  },
];

export default function TemplatesPage() {
  const [filter, setFilter] = useState<TemplateKind | "all">("all");

  const visibleTemplates = useMemo(
    () => (filter === "all" ? TEMPLATES : TEMPLATES.filter((template) => template.kind === filter)),
    [filter],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_top_right,rgba(77,122,255,0.14),transparent_52%)] lg:block" />
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Templates</div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
            Start from a proven business pattern, then tailor it to the company.
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-text-muted">
            The strongest builders do not start with a blank canvas every time. They offer concrete
            starting patterns, guided setup, and a clear launch path that still bends to the
            business.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={filter === "all" ? "btn-primary" : "btn-secondary"}
            >
              All templates
            </button>
            <button
              onClick={() => setFilter("agent")}
              className={filter === "agent" ? "btn-primary" : "btn-secondary"}
            >
              Agents
            </button>
            <button
              onClick={() => setFilter("automation")}
              className={filter === "automation" ? "btn-primary" : "btn-secondary"}
            >
              Automations
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="badge-muted">
            <Sparkles className="h-3.5 w-3.5" />
            Best practice
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-text">Guided setup</h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Each template should guide the user through business context, launch logic, and only the
            truly necessary connections.
          </p>
        </div>
        <div className="card">
          <div className="badge-muted">
            <CalendarClock className="h-3.5 w-3.5" />
            Builder pattern
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-text">Concrete steps</h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Strong templates make the build path visible: trigger, logic, actions, approvals,
            connection burden, and launch review.
          </p>
        </div>
        <div className="card">
          <div className="badge-muted">
            <Filter className="h-3.5 w-3.5" />
            Friction control
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-text">Low-setup first</h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            The best templates should still deliver value before every downstream account is wired
            live.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {visibleTemplates.map((template) => (
          <div key={template.id} className="card-hover">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="badge-muted">
                  {template.kind === "agent" ? <Bot className="h-3.5 w-3.5" /> : <GitBranch className="h-3.5 w-3.5" />}
                  {template.kind === "agent" ? "Agent template" : "Automation template"}
                </div>
                <h2 className="mt-4 font-display text-2xl font-semibold text-text">{template.title}</h2>
                <p className="mt-2 text-sm leading-7 text-text-muted">{template.summary}</p>
              </div>
              <span className="badge-green">{template.connectionBurden} friction</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Business lane</div>
                <div className="mt-2 text-sm text-text">{template.lane}</div>
              </div>
              <div className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Primary outcome</div>
                <div className="mt-2 text-sm text-text">{template.outcome}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-[0.18em] text-text-dim">Build flow</div>
              <div className="mt-3 space-y-2">
                {template.steps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-text-muted"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-dim text-xs text-accent">
                      {index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/generate?kind=${template.kind}&prompt=${encodeURIComponent(template.prompt)}`}
                className="btn-primary"
              >
                <PlayCircle className="h-4 w-4" />
                Use template
              </Link>
              <Link href="/dashboard/create" className="btn-secondary">
                <Workflow className="h-4 w-4" />
                Open builder
              </Link>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Need something custom?</h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              Start from the guided builder, describe the business job in plain language, and let
              Dobly generate the first draft around your context.
            </p>
          </div>
          <Link href="/dashboard/create" className="btn-primary">
            Build from scratch
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
