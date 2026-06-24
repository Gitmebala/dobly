import { redirect } from "next/navigation";
import { Calendar, TrendingUp, AlertTriangle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { getBriefings, getOrCreateLatestBriefing } from "@/lib/briefings/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function displayTitle(item: any, fallback: string) {
  return item?.title || item?.action || item?.type || item?.reason || fallback;
}

function displayBody(item: any, fallback = "") {
  return item?.description || item?.context || item?.reason || item?.message || item?.nextAction || fallback;
}

export default async function BriefingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  const userId = user.id;

  const latestBriefing = await getOrCreateLatestBriefing({ userId, briefingType: "morning" }).catch(() => null);
  const briefings = await getBriefings(userId, { limit: 20 }).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Owner briefings</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              What happened, what matters, and what you should do.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              Dobly synthesizes operational data into concise daily briefings so you can stay informed without drowning in details.
            </p>
          </div>
          <div className="badge-green">
            <Calendar className="h-3.5 w-3.5" />
            Daily
          </div>
        </div>
      </section>

      {latestBriefing ? (
        <>
          <section className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-text-dim">
                  {new Date(latestBriefing.created_at).toLocaleDateString()}
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold text-text">
                  {latestBriefing.briefing_type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </h2>
              </div>
              {!latestBriefing.read_at && (
                <div className="badge-accent">New</div>
              )}
            </div>

            <div className="mt-6">
              <div className="font-display text-xl font-semibold text-text">
                {latestBriefing.business_status}
              </div>
            </div>
          </section>

          {latestBriefing.what_happened && latestBriefing.what_happened.length > 0 && (
            <section className="card">
              <h3 className="font-display text-xl font-semibold text-text mb-4">What happened</h3>
              <div className="space-y-3">
                {latestBriefing.what_happened.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-accent" />
                    <div className="flex-1 text-text-muted">{displayBody(item, displayTitle(item, "Update recorded"))}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {latestBriefing.what_matters && latestBriefing.what_matters.length > 0 && (
            <section className="card">
              <h3 className="font-display text-xl font-semibold text-text mb-4">What matters</h3>
              <div className="space-y-3">
                {latestBriefing.what_matters.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
                    <AlertTriangle className="h-5 w-5 text-accent mt-0.5" />
                    <div className="flex-1 text-text">
                      <div className="font-medium">{displayTitle(item, "Attention needed")}</div>
                      <div className="mt-1 text-sm text-text-muted">{displayBody(item)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {latestBriefing.dobly_recommendations && latestBriefing.dobly_recommendations.length > 0 && (
            <section className="card">
              <h3 className="font-display text-xl font-semibold text-text mb-4">Dobly recommendations</h3>
              <div className="space-y-3">
                {latestBriefing.dobly_recommendations.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-green-200/20 bg-green-50/5 p-4">
                    <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-text">{displayTitle(item, "Recommendation")}</div>
                      <div className="mt-1 text-sm text-text-muted">{displayBody(item)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {latestBriefing.needs_decision && latestBriefing.needs_decision.length > 0 && (
            <section className="card">
              <h3 className="font-display text-xl font-semibold text-text mb-4">Needs your decision</h3>
              <div className="space-y-3">
                {latestBriefing.needs_decision.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-yellow-200/20 bg-yellow-50/5 p-4">
                    <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-text">{displayTitle(item, "Decision needed")}</div>
                      <div className="mt-1 text-sm text-text-muted">{displayBody(item)}</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-text-dim" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {latestBriefing.opportunities && latestBriefing.opportunities.length > 0 && (
            <section className="card">
              <h3 className="font-display text-xl font-semibold text-text mb-4">Opportunities</h3>
              <div className="space-y-3">
                {latestBriefing.opportunities.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-green-200/20 bg-green-50/5 p-4">
                    <TrendingUp className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-text">{displayTitle(item, "Opportunity")}</div>
                      <div className="mt-1 text-sm text-text-muted">{displayBody(item)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {latestBriefing.risks && latestBriefing.risks.length > 0 && (
            <section className="card">
              <h3 className="font-display text-xl font-semibold text-text mb-4">Risks to watch</h3>
              <div className="space-y-3">
                {latestBriefing.risks.map((item: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-red-200/20 bg-red-50/5 p-4">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-text">{displayTitle(item, "Risk")}</div>
                      <div className="mt-1 text-sm text-text-muted">{displayBody(item)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="card">
          <div className="flex flex-col items-center py-12">
            <Calendar className="h-12 w-12 text-text-dim" />
            <div className="mt-4 font-display text-xl font-semibold text-text">No briefings yet</div>
            <div className="mt-2 text-sm text-text-muted">
              Briefings will be generated daily once your coworkers are active
            </div>
          </div>
        </section>
      )}

      {briefings && briefings.length > 1 && (
        <section className="card">
          <h3 className="font-display text-xl font-semibold text-text mb-4">Previous briefings</h3>
          <div className="space-y-3">
            {briefings.slice(1).map((briefing: any) => (
              <div key={briefing.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <div className="font-medium text-text">
                    {briefing.briefing_type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </div>
                  <div className="text-sm text-text-muted">
                    {new Date(briefing.created_at).toLocaleDateString()}
                  </div>
                </div>
                {briefing.read_at ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <div className="badge-accent">New</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
