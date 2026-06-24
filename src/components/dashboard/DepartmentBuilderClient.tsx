"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  ClipboardList,
  CheckCircle2,
  Code2,
  FlaskConical,
  FolderKanban,
  Handshake,
  HeartPulse,
  Loader2,
  Megaphone,
  MessageSquareText,
  Phone,
  Radar,
  Palette,
  ShieldCheck,
  Siren,
  UserRoundCog,
  Wallet,
} from "lucide-react";
import type { DepartmentBundle, LaunchDepartmentId } from "@/lib/department-bundles";
import type { HomebaseDepartmentView } from "@/lib/office/homebase";

const DEPARTMENT_ICONS: Record<LaunchDepartmentId, typeof Building2> = {
  reception: Phone,
  sales: MessageSquareText,
  marketing: Megaphone,
  creative: Palette,
  support: ShieldCheck,
  finance: Wallet,
  engineering: Code2,
  operations: Building2,
  admin: ClipboardList,
  projects: FolderKanban,
  hr: UserRoundCog,
  growth: FlaskConical,
  analytics: Activity,
  compliance: Siren,
};

export default function DepartmentBuilderClient({
  departments,
  officeDepartments = [],
}: {
  departments: DepartmentBundle[];
  officeDepartments?: HomebaseDepartmentView[];
}) {
  const [launching, setLaunching] = useState<LaunchDepartmentId | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function launchDepartment(department: DepartmentBundle) {
    setLaunching(department.id);
    setResult(null);

    startTransition(async () => {
      const response = await fetch("/api/departments/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: department.id }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResult(payload?.error ?? "Dobly could not launch this department yet.");
        setLaunching(null);
        return;
      }

      const missing =
        Array.isArray(payload.missingChannels) && payload.missingChannels.length > 0
          ? ` Recommended channels still needed: ${payload.missingChannels.join(", ")}.`
          : "";
      setResult(`${department.name} launched with ${payload.workers?.length ?? 0} workers.${missing}`);
      setLaunching(null);
    });
  }

  const officeById = new Map(officeDepartments.map((department) => [department.id, department]));
  const activeCount = officeDepartments.filter((department) => department.activeWorkers > 0 || department.openTasks > 0).length;
  const totalCoworkers = officeDepartments.reduce((sum, department) => sum + department.activeWorkers, 0);
  const totalRecords = officeDepartments.reduce((sum, department) => sum + department.operatingRecordCount, 0);
  const totalApprovals = officeDepartments.reduce((sum, department) => sum + department.approvalCount, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--dobly-border)] bg-[radial-gradient(circle_at_18%_12%,rgba(196,80,26,0.2),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(242,232,220,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(242,232,220,0.22)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Company map</div>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[var(--dobly-text)]">
              Departments are the navigation. Coworkers are the workers. Chats are the audit trail.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
              A user should not manage prompts, MCP servers, APIs, or scattered bots. They open Marketing, Finance,
              Sales, Creative, Engineering, or any other room and see the full operating picture: who is working, what
              happened, what needs approval, what tools are connected, and what Dobly is moving next.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <PulseMetric label="Active rooms" value={String(activeCount)} />
              <PulseMetric label="Coworkers" value={String(totalCoworkers)} />
              <PulseMetric label="Records" value={String(totalRecords)} />
              <PulseMetric label="Approvals" value={String(totalApprovals)} />
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.04)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.08)]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Inside every department</div>
          <div className="mt-4 grid gap-3">
            {[
              "Coworker desks with their own chat and memory",
              "Department records: leads, invoices, content, tickets, tasks, releases",
              "Live work queue with approvals and safe actions",
              "Activity feed showing what happened and why",
              "Connected tools, channels, and handoffs to other rooms",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-[1.1rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.03)] p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgba(196,80,26,0.13)] text-xs font-semibold text-[var(--dobly-accent)]">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-[var(--dobly-text-secondary)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
      {departments.map((department) => {
        const Icon = DEPARTMENT_ICONS[department.id];
        const busy = isPending && launching === department.id;
        const office = officeById.get(department.id);

        return (
          <article key={department.id} className="card-hover flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[rgba(196,80,26,0.13)] text-[var(--dobly-accent)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">
                    Department
                  </div>
                  <h2 className="mt-1 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">
                    {department.name}
                  </h2>
                </div>
              </div>
              <span className="badge-muted text-xs">
                {office?.activeWorkers ?? 0} live / {department.workerTemplateKeys.length} starters
              </span>
            </div>

            <p className="mt-5 text-base font-medium leading-7 text-[var(--dobly-text)]">{department.outcome}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--dobly-text-secondary)]">{department.description}</p>

            <div className="mt-5 rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="Records" value={String(office?.operatingRecordCount ?? 0)} />
                <MiniStat label="Open work" value={String(office?.openTasks ?? 0)} />
                <MiniStat label="Approvals" value={String(office?.approvalCount ?? 0)} />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
                <Bot className="h-3.5 w-3.5" />
                Starter coworker desks
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {department.workerTemplateKeys.map((key) => (
                  <span key={key} className="badge-muted text-xs">
                    {key.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Recommended channels
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {department.recommendedChannels.map((channel) => (
                  <span key={channel} className="badge-muted text-xs">
                    {channel.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
                <Handshake className="h-3.5 w-3.5" />
                Orchestration modes
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {department.orchestrationModes.map((mode) => (
                  <span key={mode} className="badge-muted text-xs">
                    {mode}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.025)] p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">
                {department.id === "finance" ? <HeartPulse className="h-3.5 w-3.5" /> : <Radar className="h-3.5 w-3.5" />}
                Autonomy boundary
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--dobly-text-secondary)]">{department.autonomyBoundary}</p>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--dobly-text-muted)]">{department.activationPromise}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href={`/dashboard/departments/${department.id}`} className="btn-secondary justify-center">
                Open department
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => launchDepartment(department)}
                disabled={isPending}
                className="btn-primary justify-center"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Launch starters
              </button>
            </div>
          </article>
        );
      })}

      {result ? (
        <div className="lg:col-span-2 rounded-2xl border border-[rgba(84,186,123,0.22)] bg-[rgba(84,186,123,0.08)] px-5 py-4 text-sm text-[var(--dobly-text-secondary)]">
          {result}
        </div>
      ) : null}
      </div>
    </div>
  );
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[rgba(242,232,220,0.1)] bg-[rgba(255,255,255,0.05)] p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className="mt-1 font-display text-2xl tracking-[-0.04em] text-[var(--dobly-text)]">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.95rem] bg-[rgba(255,255,255,0.035)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--dobly-text-dim)]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[var(--dobly-text)]">{value}</div>
    </div>
  );
}
