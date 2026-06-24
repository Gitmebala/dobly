import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, BriefcaseBusiness, UserRound, Workflow } from "lucide-react";
import {
  BUSINESS_STARTER_TEMPLATES,
  PERSONAL_STARTER_TEMPLATES,
  STARTER_TEMPLATES,
} from "@/lib/starter-templates";
import { searchMarketplaceWorkers } from "@/lib/capability-profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DOBLY_DEEP_VERTICALS, DOBLY_VERTICAL_FAMILY_LABELS, getDoblyVerticalByTemplate } from "@/lib/verticals";

function TemplateCard({
  title,
  summary,
  prompt,
  category,
  type,
  templateId,
}: {
  title: string;
  summary: string;
  prompt: string;
  category: string;
  type: "agent" | "automation";
  templateId: string;
}) {
  const vertical = getDoblyVerticalByTemplate(templateId);
  return (
    <Link
      href={`/dashboard/generate?kind=${type}&prompt=${encodeURIComponent(prompt)}`}
      className="card-hover rounded-[1.7rem] p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="badge-muted">{category}</span>
        <span className="badge-green">
          {type === "agent" ? <Bot className="h-3.5 w-3.5" /> : <Workflow className="h-3.5 w-3.5" />}
          {type}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-text-muted">{summary}</p>
      {vertical ? <p className="mt-3 text-xs uppercase tracking-[0.12em] text-text-dim">{vertical.title}</p> : null}
    </Link>
  );
}

export default async function TemplatesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const familyGroups = Object.entries(DOBLY_VERTICAL_FAMILY_LABELS).map(([familyId, label]) => ({
    label,
    items: DOBLY_DEEP_VERTICALS.filter((vertical) => vertical.family === familyId),
  }));
  const marketplace = await searchMarketplaceWorkers({ limit: 6 }).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-0">
      <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Templates</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              Start from something close.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
              Pick a starter workflow and let Dobly fill in the right steps.
            </p>
          </div>
          <div className="rounded-full border border-border bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-text-muted">
            {STARTER_TEMPLATES.length} templates
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <UserRound className="h-4 w-4 text-text-dim" />
            Personal
          </div>
          <div className="grid gap-4">
            {PERSONAL_STARTER_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} {...template} templateId={template.id} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <BriefcaseBusiness className="h-4 w-4 text-text-dim" />
            Business
          </div>
          <div className="grid gap-4">
            {BUSINESS_STARTER_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} {...template} templateId={template.id} />
            ))}
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Deep verticals</div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-text">Where Dobly is getting really good</h2>
          </div>
          <span className="badge-muted">{DOBLY_DEEP_VERTICALS.length} tuned flows</span>
        </div>

        <div className="mt-6 space-y-6">
          {familyGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-text-dim">{group.label}</div>
              <div className="grid gap-4 lg:grid-cols-2">
                {group.items.map((vertical) => (
                  <div key={vertical.id} className="rounded-[1.4rem] border border-border bg-[rgba(255,255,255,0.03)] p-5">
                    <div className="text-lg font-medium text-text">{vertical.title}</div>
                    <p className="mt-2 text-sm leading-7 text-text-muted">{vertical.tagline}</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <VerticalInfo title="Talents" items={vertical.talents.slice(0, 3).map((item) => item.replace(/-/g, " "))} />
                      <VerticalInfo title="Approvals" items={vertical.approvalRules.slice(0, 3)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel rounded-[2rem] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Marketplace workers</div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-text">Live specialist packs</h2>
          </div>
          <Link href="/dashboard/marketplace" className="badge-muted">
            Open marketplace
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {marketplace.length > 0 ? (
            marketplace.map((profile) => (
              <div key={profile.id} className="rounded-[1.4rem] border border-border bg-[rgba(255,255,255,0.03)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="badge-muted">{profile.scope.replaceAll("_", " ")}</span>
                  <span className="badge-green">{profile.monthlyPriceUsd ? `$${profile.monthlyPriceUsd}/mo` : "free"}</span>
                </div>
                <div className="mt-4 text-lg font-medium text-text">{profile.title}</div>
                <p className="mt-2 text-sm leading-7 text-text-muted">{profile.summary}</p>
                <div className="mt-4 text-xs uppercase tracking-[0.12em] text-text-dim">
                  {profile.provider ?? "multi-provider"} · {profile.installCount} installs
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-border bg-[rgba(255,255,255,0.02)] p-5 text-sm text-text-muted lg:col-span-3">
              No marketplace workers have been published yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function VerticalInfo({ title, items }: { title: string; items: string[] }) {
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
