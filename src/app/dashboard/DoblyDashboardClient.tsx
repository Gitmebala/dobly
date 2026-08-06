"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Link2,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

type LoopRecord = {
  id: string;
  name: string;
  operatorId: string;
  operatorName: string;
  status: string;
  updatedAt: string;
};

type RunRecord = {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
};

type ApprovalRecord = {
  id: string;
  title: string;
  message: string;
  requested_at: string;
};

type ConnectionRecord = {
  id: string;
  provider: string;
  status: string;
  updated_at: string;
};

type TeamMember = {
  id: string;
  name: string;
  mission: string;
  status: string;
  kind?: string;
  lastRunAt: string | null;
  loopCount?: number;
};

type SignalSummary = {
  totalSignals: number;
  unresolvedSignals: number;
  criticalSignals: number;
  byType: Record<string, number>;
  byImpact: Record<string, number>;
  recentSignals: Array<{ id: string; title?: string | null; description?: string | null; signal_type: string; impact_level?: string | null; created_at: string }>;
};

type Snapshot = {
  corePromise: string;
  focusReason: string;
  focusWedge: string;
  metrics: {
    activeSystems: number;
    ranToday: number;
    failedToday: number;
    waitingApprovals: number;
    reconnectNeeded: number;
    changedRecently: number;
    timeSavedHours: number;
  };
  recommendations: { title: string }[];
  businessMemory: string[];
  whatNeedsAttention: string[];
};

export default function DoblyDashboardClient({
  recentLoops,
  latestRuns,
  latestApprovals,
  latestConnections,
  snapshot,
  workflowTitles,
  runLabels,
  onboarding,
  firstName,
  team = [],
  signalSummary,
  pulseScore = 100,
  justOnboarded = false,
}: {
  recentLoops: LoopRecord[];
  latestRuns: RunRecord[];
  latestApprovals: ApprovalRecord[];
  latestConnections: ConnectionRecord[];
  snapshot: Snapshot;
  workflowTitles: Record<string, string>;
  runLabels: Record<string, string>;
  onboarding: {
    hasBusinessContext: boolean;
    hasConnection: boolean;
    hasWorkflow: boolean;
  };
  firstName?: string;
  team?: TeamMember[];
  signalSummary?: SignalSummary;
  pulseScore?: number;
  justOnboarded?: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [showWelcome, setShowWelcome] = useState(justOnboarded);
  const name = firstName || "there";
  const setupComplete = onboarding.hasBusinessContext && onboarding.hasConnection && onboarding.hasWorkflow;
  const quickPrompts = [
    "Research an opportunity",
    "Plan a recurring operation",
    "Handle customer conversations",
    "Build and ship something",
  ];

  function submitWork() {
    const value = prompt.trim();
    if (!value) return;
    router.push(`/dashboard/generate?prompt=${encodeURIComponent(value)}`);
  }

  const hour = new Date().getHours();
  const daypart = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const workingCount = team.filter((member) => member.status === "active").length;

  return (
    <div className="ref-page home-editorial">
      {showWelcome ? (
        <div className="home-welcome-banner dobly-anim-rise">
          <Sparkles size={16} />
          <span>Your workspace is live. This is Homebase — everything your team does shows up here from now on.</span>
          <button type="button" onClick={() => setShowWelcome(false)} aria-label="Dismiss">Got it</button>
        </div>
      ) : null}
      <div className="ref-page-grid">
        <main className="ref-page-main">
          <header className="home-masthead">
            <span className="home-date">{todayLabel}</span>
            <h1>Good {daypart}, {name}.</h1>
            <p>
              {team.length
                ? `${workingCount ? `${workingCount} of your ${team.length} coworker${team.length === 1 ? " is" : "s are"} on the clock.` : "Your team is standing by."} ${snapshot.metrics.waitingApprovals ? `${snapshot.metrics.waitingApprovals} decision${snapshot.metrics.waitingApprovals === 1 ? " needs" : "s need"} you.` : "Nothing needs your decision right now."}`
                : snapshot.corePromise || "Hire your first coworker and hand over the work you shouldn't be doing."}
            </p>
          </header>

          {!setupComplete ? (
            <div className="home-setup-line">
              <span>Before Dobly can do trustworthy work: {[!onboarding.hasBusinessContext && "business context", !onboarding.hasConnection && "one connection", !onboarding.hasWorkflow && "a first outcome"].filter(Boolean).join(", ")}.</span>
              <Link href="/dashboard/onboarding">Finish setup <ArrowRight size={13} /></Link>
            </div>
          ) : null}

          <div className="home-command">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitWork();
              }}
              placeholder="Describe an outcome, a problem, or a recurring job..."
              aria-label="Tell Dobly what to handle"
            />
            <button type="button" onClick={submitWork} aria-label="Send to Dobly"><Send size={16} /></button>
          </div>
          <div className="home-command-starters" aria-label="Suggested starting points">
            {quickPrompts.map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}>{item}</button>)}
          </div>

          <section className="home-section home-hub-section">
            <header className="home-section-head">
              <h2><i>01</i> Your business</h2>
              <Link href="/dashboard/coworkers">Open workspace</Link>
            </header>
            <BusinessHub team={team} />
          </section>

          <section className="home-section">
            <header className="home-section-head">
              <h2><i>02</i> Your team</h2>
              <Link href="/dashboard/coworkers">Open workspace</Link>
            </header>
            <div className="home-roster">
              {team.map((member) => (
                <Link key={member.id} href={`/dashboard/coworkers?operatorId=${member.id}`} className="home-roster-row">
                  <span className="home-roster-avatar" aria-hidden="true">{member.name.slice(0, 1).toUpperCase()}</span>
                  <span className="home-roster-name">{member.name}</span>
                  <span className="home-roster-mission">{member.mission}</span>
                  <span className="home-roster-status" data-status={member.status}>
                    <i aria-hidden="true" />
                    {member.status === "active"
                      ? member.lastRunAt ? `active ${formatDate(member.lastRunAt)}` : "ready"
                      : member.status}
                  </span>
                </Link>
              ))}
              <Link href="/dashboard/coworkers?create=true" className="home-roster-row home-roster-hire">
                <span className="home-roster-avatar" aria-hidden="true"><Plus size={15} /></span>
                <span className="home-roster-name">Hire a coworker</span>
                <span className="home-roster-mission">Describe a job. Dobly proposes the person, tools, and rules.</span>
                <span className="home-roster-status"><ArrowRight size={14} /></span>
              </Link>
            </div>
          </section>

          <section className="home-section">
            <header className="home-section-head">
              <h2><i>03</i> The numbers</h2>
            </header>
            <div className="home-figures">
              <div><b>{snapshot.metrics.activeSystems}</b><span>Active systems</span></div>
              <div><b>{snapshot.metrics.ranToday}</b><span>Runs today</span></div>
              <div><b>{snapshot.metrics.waitingApprovals}</b><span>Awaiting you</span></div>
              <div><b>{Math.round(snapshot.metrics.timeSavedHours || 0)}h</b><span>Time returned</span></div>
            </div>
          </section>

          <section className="home-section">
            <header className="home-section-head">
              <h2><i>04</i> Loops</h2>
              <Link href="/dashboard/workflows">View all</Link>
            </header>
            {recentLoops.length ? (
              <div className="home-list">
                {recentLoops.map((loop) => (
                  <Link className="home-list-row" href={`/dashboard/coworkers?operatorId=${loop.operatorId}`} key={loop.id}>
                    <span className="home-list-main">
                      <strong>{loop.name}</strong>
                      <small>{loop.operatorName}</small>
                    </span>
                    <span className="home-list-meta">
                      <em data-status={loop.status}>{loop.status}</em>
                      <time>{formatDate(loop.updatedAt)}</time>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="home-empty-line">Nothing is running yet. Describe the first outcome you want Dobly to own, above.</p>
            )}
          </section>

          <section className="home-section home-columns">
            <div>
              <header className="home-section-head">
                <h2><i>05</i> Recent runs</h2>
                <Link href="/dashboard/activity">History</Link>
              </header>
              {latestRuns.length ? (
                <div className="home-list">
                  {latestRuns.slice(0, 4).map((run) => (
                    <div className="home-list-row" key={run.id}>
                      <span className="home-list-main">
                        <strong>{workflowTitles[run.workflow_id] || runLabels[run.id] || "Coworker run"}</strong>
                        <small>{run.status}</small>
                      </span>
                      <span className="home-list-meta"><time>{formatDate(run.started_at)}</time></span>
                    </div>
                  ))}
                </div>
              ) : <p className="home-empty-line">Runs will appear once a system starts working.</p>}
            </div>
            <div>
              <header className="home-section-head">
                <h2><i>06</i> Dobly recommends</h2>
              </header>
              {snapshot.recommendations.length ? (
                <div className="home-list">
                  {snapshot.recommendations.slice(0, 4).map((item) => (
                    <div className="home-list-row" key={item.title}>
                      <span className="home-list-main"><strong>{item.title}</strong></span>
                      <span className="home-list-meta"><ArrowRight size={14} /></span>
                    </div>
                  ))}
                </div>
              ) : <p className="home-empty-line">Recommendations form as Dobly learns the business.</p>}
            </div>
          </section>
        </main>

        <aside className="ref-page-rail ref-stack">
          <section className="ref-card ref-panel home-pulse">
            <div className="ref-between"><strong>Pulse</strong><span className="home-pulse-score">{Math.round(pulseScore)}<em>%</em></span></div>
            <p className="ref-muted" style={{ margin: "2px 0 12px" }}>Overall business health</p>
            <div className="home-pulse-bar"><div style={{ width: `${Math.round(pulseScore)}%` }} /></div>
          </section>

          {signalSummary && signalSummary.totalSignals > 0 ? (
            <section className="ref-card ref-panel">
              <div className="ref-between"><strong>Signals</strong><span className="ref-pill">{signalSummary.unresolvedSignals}</span></div>
              {signalSummary.recentSignals.length ? (
                <div className="ref-simple-rows">
                  {signalSummary.recentSignals.slice(0, 4).map((signal) => (
                    <div className="ref-between" key={signal.id}>
                      <span>{signal.title || signal.description || signal.signal_type.replaceAll("_", " ")}</span>
                      <i data-status={signal.impact_level === "critical" || signal.impact_level === "high" ? "amber" : undefined} aria-hidden="true" />
                    </div>
                  ))}
                </div>
              ) : <p className="ref-muted">Nothing flagged right now.</p>}
            </section>
          ) : null}

          <section className="ref-card ref-panel ref-focus">
            <div className="ref-between"><strong><ShieldCheck size={17} /> Needs attention</strong><span className="ref-pill">{snapshot.whatNeedsAttention.length}</span></div>
            {snapshot.whatNeedsAttention.length ? (
              <div className="ref-simple-rows">
                {snapshot.whatNeedsAttention.slice(0, 4).map((item) => <div className="ref-between" key={item}><span>{item}</span><ArrowRight size={14} /></div>)}
              </div>
            ) : <div className="ref-focus-box"><CheckCircle2 size={28} color="var(--app-green)" /><span>Nothing needs intervention.</span></div>}
          </section>

          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>Approvals</strong><Link href="/dashboard/approvals">Open queue</Link></div>
            {latestApprovals.length ? (
              <div className="ref-simple-rows">
                {latestApprovals.slice(0, 3).map((approval) => (
                  <div key={approval.id}><span>{approval.title || approval.message}</span></div>
                ))}
              </div>
            ) : <p className="ref-muted">No actions are waiting for approval.</p>}
          </section>

          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>Connections</strong><Link href="/dashboard/connections">Manage</Link></div>
            {latestConnections.length ? (
              <div className="ref-simple-rows">
                {latestConnections.map((connection) => (
                  <div className="ref-between" key={connection.id}>
                    <span><Link2 size={13} /> {connection.provider}</span>
                    <span className={`ref-pill ${connection.status === "connected" ? "green" : "amber"}`}>{connection.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="ref-muted">Connect the tools Dobly needs to take action.</p>}
          </section>

          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>Time returned</strong><Clock3 size={17} /></div>
            <h2 style={{ margin: "18px 0 4px", fontSize: 34 }}>{Math.round(snapshot.metrics.timeSavedHours || 0)}h</h2>
            <p className="ref-muted">Estimated from completed operating work.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div><b>{value}</b><span>{label}</span></div>;
}

function EmptyState({ title, copy, href, action }: { title: string; copy: string; href: string; action: string }) {
  return (
    <div className="ref-panel" style={{ textAlign: "center", padding: 36 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p className="ref-muted">{copy}</p>
      <Link className="ref-button primary" href={href}><Play size={14} /> {action}</Link>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

// A literal picture of "your business": each hired coworker as a node
// orbiting the center. Deliberately shows real coworkers, not invented
// department buckets (dobly_operators has no office/department column -
// only a free-text scope string - so anything claiming to group by
// "Sales, Marketing, Finance" would be fabricated for most Dobly users).
function BusinessHub({ team }: { team: TeamMember[] }) {
  if (!team.length) {
    return (
      <div className="home-hub home-hub-empty">
        <div className="home-hub-center">
          <strong>D</strong>
          <span>Your business</span>
        </div>
        <p>Hire your first coworker and it will show up here, orbiting the business it works for.</p>
        <Link href="/dashboard/coworkers?create=true" className="ref-button primary"><Plus size={14} /> Hire a coworker</Link>
      </div>
    );
  }

  const radius = 132;
  const nodeSize = 108;
  const angleStep = (2 * Math.PI) / team.length;
  // Start pointing up (-90deg) so a single or first coworker sits at the top.
  const startAngle = -Math.PI / 2;

  return (
    <div className="home-hub" role="img" aria-label={`${team.length} coworkers orbiting your business`}>
      <svg viewBox="-190 -190 380 380" width="100%" height="380" aria-hidden="true">
        {team.map((member, index) => {
          const angle = startAngle + angleStep * index;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return <line key={member.id} x1={0} y1={0} x2={x} y2={y} className="home-hub-spoke" strokeDasharray="2 5" />;
        })}
      </svg>
      <div className="home-hub-center">
        <strong>D</strong>
        <span>Your business</span>
      </div>
      {team.map((member, index) => {
        const angle = startAngle + angleStep * index;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <Link
            key={member.id}
            href={`/dashboard/coworkers?operatorId=${member.id}`}
            className="home-hub-node"
            data-status={member.status}
            style={{ transform: `translate(${x}px, ${y}px)`, width: nodeSize }}
          >
            <span className="home-hub-node-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
            <span className="home-hub-node-name">{member.name}</span>
            <span className="home-hub-node-meta">{member.loopCount ?? 0} loop{member.loopCount === 1 ? "" : "s"}</span>
            <i data-status={member.status} aria-hidden="true" />
          </Link>
        );
      })}
      <Link href="/dashboard/coworkers?create=true" className="home-hub-add" aria-label="Hire a coworker"><Plus size={16} /></Link>
    </div>
  );
}
