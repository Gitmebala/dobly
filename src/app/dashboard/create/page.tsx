import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { BUSINESS_STARTER_TEMPLATES, PERSONAL_STARTER_TEMPLATES } from "@/lib/starter-templates";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DOBLY_DEEP_VERTICALS, DOBLY_VERTICAL_FAMILY_LABELS } from "@/lib/verticals";

export default async function CreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ kind?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedSearchParams = await searchParams;
  const kind = resolvedSearchParams?.kind === "agent" || resolvedSearchParams?.kind === "automation" ? resolvedSearchParams.kind : null;
  const promptSeed =
    kind === "agent"
      ? "Review new customer conversations, draft replies, and only escalate the ones that need my approval."
      : kind === "automation"
        ? "When a payment is overdue, send the reminder, update the record, and notify me only if the invoice still stalls."
        : "Build me a system that turns inbound demand into the right follow-up, tracks what happened, and only asks me to step in when the case is high-risk or genuinely unclear.";
  const familyGroups = Object.entries(DOBLY_VERTICAL_FAMILY_LABELS).map(([familyId, label]) => ({
    label,
    items: DOBLY_DEEP_VERTICALS.filter((vertical) => vertical.family === familyId),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-0">
      <section className="rounded-[1.3rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(16,18,23,0.96)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Coworker builder</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Describe the coworker you want Dobly to deliver</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
              Start with the role, responsibility, and standard. Dobly will turn that into a bounded coworker package with playbooks, approvals, memory, and launch readiness.
            </p>
          </div>
          {kind ? <span className="badge-muted capitalize">{kind}</span> : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <LaunchPillar
            icon={<Bot className="h-4 w-4" />}
            title="Coworker package"
            body="Every build should ship with a role, mission, tools, escalation boundaries, and measurable success."
          />
          <LaunchPillar
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Trust-ready"
            body="Dobly should start supervised, earn authority, and keep a clear approval contract from day one."
          />
          <LaunchPillar
            icon={<Waves className="h-4 w-4" />}
            title="Persistent delivery"
            body="The goal is not one-time automation. The goal is a coworker that keeps the function running permanently."
          />
        </div>

        <div className="mt-6 rounded-[1.2rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
          <textarea
            readOnly
            value={promptSeed}
            className="min-h-[180px] w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-8 text-text outline-none"
          />
          <div className="mt-3 flex items-center justify-end border-t border-[rgba(255,255,255,0.08)] pt-3">
            <Link
              href={`/dashboard/generate${kind ? `?kind=${kind}&prompt=${encodeURIComponent(promptSeed)}` : `?prompt=${encodeURIComponent(promptSeed)}`}`}
              className="btn-primary px-4 py-2.5"
            >
              Continue to coworker builder
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TemplatePanel title="Business starters" items={BUSINESS_STARTER_TEMPLATES.slice(0, 5)} />
        <TemplatePanel title="Personal starters" items={PERSONAL_STARTER_TEMPLATES.slice(0, 5)} />
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Dobly deep verticals</div>
            <h2 className="mt-2 text-2xl font-semibold text-text">The use cases Dobly is tuning hardest</h2>
          </div>
          <span className="badge-muted">{DOBLY_DEEP_VERTICALS.length} verticals</span>
        </div>

        <div className="mt-5 space-y-6">
          {familyGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-text-dim">{group.label}</div>
              <div className="grid gap-4 lg:grid-cols-2">
                {group.items.map((vertical) => (
                  <div key={vertical.id} className="rounded-[1.1rem] border border-border bg-[rgba(255,255,255,0.03)] p-4">
                    <div className="text-sm font-medium text-text">{vertical.title}</div>
                    <p className="mt-2 text-sm leading-7 text-text-muted">{vertical.tagline}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MiniList title="Toolkit" items={vertical.toolkit.slice(0, 3)} />
                      <MiniList title="Talents" items={vertical.talents.slice(0, 3).map((item) => item.replace(/-/g, " "))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TemplatePanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; title: string; prompt: string; type: "agent" | "automation" }>;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-sm font-medium text-text">
        <Sparkles className="h-4 w-4 text-text-dim" />
        {title}
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/generate?kind=${item.type}&prompt=${encodeURIComponent(item.prompt)}`}
            className="rounded-[1rem] border border-border bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-text-muted transition hover:bg-[rgba(255,255,255,0.05)] hover:text-text"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">{title}</div>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="text-sm text-text-muted">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function LaunchPillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-dim">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      <p className="mt-3 text-sm leading-7 text-text-muted">{body}</p>
    </div>
  );
}
