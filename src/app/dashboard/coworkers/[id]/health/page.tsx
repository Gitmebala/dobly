import { redirect } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, TrendingUp, TrendingDown, Clock, Target, Zap } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CoworkerHealthPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: coworker }, { data: healthData }] = await Promise.all([
    supabase.from("coworkers").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    supabase
      .from("coworker_health")
      .select("*")
      .eq("coworker_id", params.id)
      .order("period_end", { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (!coworker) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card">
          <div className="text-text-muted">Coworker not found</div>
        </div>
      </div>
    );
  }

  const health = healthData;
  const healthState = health?.health_state || "learning";
  const healthColor = getHealthStateColor(healthState);
  const HealthIcon = getHealthStateIcon(healthState);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Coworker health</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              {coworker.name}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              {coworker.mission}
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${healthColor}`}>
            <HealthIcon className="h-4 w-4" />
            {healthState.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </div>
        </div>
      </section>

      {health ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <ScoreCard label="Autonomy" value={health.autonomy_score} icon={Target} />
            <ScoreCard label="Trust" value={health.trust_score} icon={ShieldAlert} />
            <ScoreCard label="Quality" value={health.quality_score} icon={CheckCircle2} />
            <ScoreCard label="Value" value={health.value_score} icon={TrendingUp} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <MetricCard label="Response speed" value={`${Math.round(health.response_speed)}s`} icon={Clock} />
            <MetricCard label="Resolution rate" value={`${Math.round(health.resolution_rate * 100)}%`} icon={CheckCircle2} />
            <MetricCard label="Escalation rate" value={`${Math.round(health.escalation_rate * 100)}%`} icon={AlertTriangle} />
            <MetricCard label="Override rate" value={`${Math.round(health.override_rate * 100)}%`} icon={Activity} />
            <MetricCard label="Conversion rate" value={`${Math.round(health.conversion_rate * 100)}%`} icon={TrendingUp} />
            <MetricCard label="Time saved" value={`${health.time_saved_hours}h`} icon={Zap} />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <ImpactCard label="Revenue captured" value={health.revenue_captured} icon={TrendingUp} tone="good" />
            <ImpactCard label="Revenue recovered" value={health.revenue_recovered} icon={Activity} tone="accent" />
            <ImpactCard label="Actions completed" value={health.actions_completed || 0} icon={Zap} tone="neutral" />
          </section>

          {health.recent_mistakes && health.recent_mistakes.length > 0 && (
            <section className="card">
              <h2 className="font-display text-2xl font-semibold text-text">Recent issues</h2>
              <div className="mt-4 space-y-3">
                {health.recent_mistakes.map((mistake: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-red-200/20 bg-red-50/5 p-4">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-text">{mistake.type || "Issue"}</div>
                      <div className="mt-1 text-sm text-text-muted">{mistake.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {health.top_improvements && health.top_improvements.length > 0 && (
            <section className="card">
              <h2 className="font-display text-2xl font-semibold text-text">Top improvements</h2>
              <div className="mt-4 space-y-3">
                {health.top_improvements.map((improvement: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 rounded-lg border border-green-200/20 bg-green-50/5 p-4">
                    <TrendingUp className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-text">{improvement.type || "Improvement"}</div>
                      <div className="mt-1 text-sm text-text-muted">{improvement.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <h2 className="font-display text-2xl font-semibold text-text">Period</h2>
            <div className="mt-4 text-sm text-text-muted">
              {new Date(health.period_start).toLocaleDateString()} - {new Date(health.period_end).toLocaleDateString()}
            </div>
          </section>
        </>
      ) : (
        <section className="card">
          <div className="flex flex-col items-center py-12">
            <Activity className="h-12 w-12 text-text-dim" />
            <div className="mt-4 font-display text-xl font-semibold text-text">No health data available</div>
            <div className="mt-2 text-sm text-text-muted">
              Health snapshots will appear after the coworker has been active
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  const percentage = Math.round(value * 100);
  const color = value > 0.7 ? "text-accent" : value > 0.4 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="premium-tile">
      <Icon className="h-5 w-5 text-text-dim" />
      <div className={`mt-3 font-display text-4xl font-bold ${color}`}>{percentage}%</div>
      <div className="mt-1 text-xs uppercase tracking-[0.24em] text-text-dim">{label}</div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-accent/10 p-2">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div>
          <div className="font-display text-2xl font-semibold text-text">{value}</div>
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ImpactCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "good" | "accent" | "neutral" }) {
  const color = tone === "good" ? "text-accent" : tone === "accent" ? "text-text" : "text-text-muted";

  return (
    <div className="premium-tile">
      <Icon className={`h-5 w-5 ${color}`} />
      <div className={`mt-3 font-display text-4xl font-bold ${color}`}>{value.toLocaleString()}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.24em] text-text-dim">{label}</div>
    </div>
  );
}

function getHealthStateColor(state: string): string {
  const colors: Record<string, string> = {
    learning: "border-accent/25 bg-accent/5 text-accent",
    reliable: "border-green-400/25 bg-green-400/5 text-green-400",
    needs_review: "border-yellow-400/25 bg-yellow-400/5 text-yellow-400",
    over_escalating: "border-yellow-400/25 bg-yellow-400/5 text-yellow-400",
    under_escalating: "border-yellow-400/25 bg-yellow-400/5 text-yellow-400",
    underperforming: "border-red-400/25 bg-red-400/5 text-red-400",
  };
  return colors[state] || "border-text-dim/25 bg-text-dim/5 text-text-dim";
}

function getHealthStateIcon(state: string): any {
  const icons: Record<string, any> = {
    learning: Activity,
    reliable: CheckCircle2,
    needs_review: AlertTriangle,
    over_escalating: AlertTriangle,
    under_escalating: AlertTriangle,
    underperforming: ShieldAlert,
  };
  return icons[state] || Activity;
}
