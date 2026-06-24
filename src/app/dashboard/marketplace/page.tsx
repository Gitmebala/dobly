import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listCapabilityProfiles, searchMarketplaceWorkers } from "@/lib/capability-profiles";

export default async function MarketplacePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [myProfiles, marketplace] = await Promise.all([
    listCapabilityProfiles({ userId: user.id, limit: 12 }).catch(() => []),
    searchMarketplaceWorkers({ limit: 18 }).catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-text-dim)]">Marketplace</div>
            <h1 className="mt-2 font-display text-3xl tracking-[-0.04em] text-[var(--dobly-text)]">
              Capability packs and specialist workers
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Bring your best operating brain into Dobly, publish specialist workers, and install reusable packs other businesses have already refined.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/memory" className="btn-ghost">
              Open business memory
            </Link>
            <Link href="/dashboard/templates" className="btn-ghost">
              Starter templates
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Your capability profiles</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--dobly-text)]">Brains you can reuse across offices</h2>
          <div className="mt-4 space-y-3">
            {myProfiles.length > 0 ? (
              myProfiles.map((profile) => (
                <div key={profile.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--dobly-text)]">{profile.title}</div>
                    <span className="badge-muted text-xs">{profile.profileType === "marketplace" ? "published" : profile.status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{profile.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--dobly-text-muted)]">
                    <span>{profile.scope.replaceAll("_", " ")}</span>
                    <span>·</span>
                    <span>{profile.tools.length} tools</span>
                    <span>·</span>
                    <span>{profile.examples.length} examples</span>
                  </div>
                </div>
              ))
            ) : (
              <Empty copy="No capability profiles yet. Save one through the API or extend business memory into reusable worker brains." />
            )}
          </div>
        </div>

        <div className="card">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--dobly-text-dim)]">Published workers</div>
          <h2 className="mt-2 font-display text-2xl text-[var(--dobly-text)]">Specialists other businesses can activate</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {marketplace.length > 0 ? (
              marketplace.map((profile) => (
                <div key={profile.id} className="rounded-[1.1rem] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--dobly-text)]">{profile.title}</div>
                    <span className="badge-muted text-xs">{profile.rating > 0 ? `${profile.rating.toFixed(1)}★` : "new"}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{profile.summary}</p>
                  <div className="mt-3 text-xs text-[var(--dobly-text-muted)]">
                    {profile.provider ?? "multi-provider"} · {profile.installCount} installs {profile.monthlyPriceUsd ? `· $${profile.monthlyPriceUsd}/mo` : "· free"}
                  </div>
                </div>
              ))
            ) : (
              <Empty copy="No marketplace workers have been published yet. Once profiles are published, they show up here automatically." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Empty({ copy }: { copy: string }) {
  return (
    <div className="rounded-[1.1rem] border border-dashed border-[rgba(242,232,220,0.12)] bg-[rgba(255,255,255,0.015)] p-4 text-sm text-[var(--dobly-text-muted)]">
      {copy}
    </div>
  );
}
