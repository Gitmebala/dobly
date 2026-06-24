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

type WorkflowRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  updated_at: string;
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
  recentWorkflows,
  latestRuns,
  latestApprovals,
  latestConnections,
  snapshot,
  workflowTitles,
  onboarding,
  firstName,
}: {
  recentWorkflows: WorkflowRecord[];
  latestRuns: RunRecord[];
  latestApprovals: ApprovalRecord[];
  latestConnections: ConnectionRecord[];
  snapshot: Snapshot;
  workflowTitles: Record<string, string>;
  onboarding: {
    hasBusinessContext: boolean;
    hasConnection: boolean;
    hasWorkflow: boolean;
  };
  firstName?: string;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
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

  return (
    <div className="ref-page">
      <div className="ref-page-grid">
        <main className="ref-page-main">
          <header className="ref-header">
            <div>
              <div className="ref-greeting"><Sparkles size={16} /> Welcome back, {name}</div>
              <h1>What should Dobly handle next?</h1>
              <p className="ref-subtitle">{snapshot.corePromise || "Direct your operators, automations, and business systems from one place."}</p>
            </div>
            <Link href="/dashboard/create" className="ref-button primary"><Plus size={16} /> Create</Link>
          </header>

          <div className="ref-stack">
            {!setupComplete ? (
              <section className="ref-card ref-setup-callout">
                <div>
                  <span><Sparkles size={14} /> Finish setup</span>
                  <strong>Give Dobly enough context to do trustworthy work.</strong>
                  <p>{[!onboarding.hasBusinessContext && "business context", !onboarding.hasConnection && "one connection", !onboarding.hasWorkflow && "a first outcome"].filter(Boolean).join(", ")} still needed.</p>
                </div>
                <Link href="/dashboard/onboarding" className="ref-button">Continue setup <ArrowRight size={14} /></Link>
              </section>
            ) : null}

            <div className="ref-command">
              <Sparkles />
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitWork();
                }}
                placeholder="Describe an outcome, problem, or recurring job..."
              />
              <button type="button" onClick={submitWork} aria-label="Send to Dobly"><Send size={17} /></button>
            </div>
            <div className="ref-quick-actions" aria-label="Suggested starting points">
              {quickPrompts.map((item) => <button type="button" key={item} onClick={() => setPrompt(item)}>{item}</button>)}
            </div>

            <section className="ref-card ref-progress">
              <Metric value={snapshot.metrics.activeSystems} label="Active systems" />
              <Metric value={snapshot.metrics.ranToday} label="Runs today" />
              <Metric value={snapshot.metrics.waitingApprovals} label="Approvals waiting" />
              <div className="ref-chart" aria-label="Workspace activity">
                {[snapshot.metrics.activeSystems, snapshot.metrics.ranToday, snapshot.metrics.changedRecently, snapshot.metrics.waitingApprovals, snapshot.metrics.failedToday].map((value, index) => (
                  <i key={index} style={{ height: `${Math.max(14, Math.min(90, value * 12 + 14))}%` }} />
                ))}
              </div>
            </section>

            <section className="ref-card">
              <div className="ref-section-title">
                <strong>Operating systems</strong>
                <Link href="/dashboard/workflows">View all</Link>
              </div>
              {recentWorkflows.length ? (
                recentWorkflows.map((workflow) => (
                  <Link className="ref-task-row" href={`/dashboard/workflows/${workflow.id}`} key={workflow.id}>
                    <span className="ref-icon" style={{ width: 30, height: 30 }}>
                      {workflow.status === "active" ? <Workflow size={15} /> : <Bot size={15} />}
                    </span>
                    <div>
                      <strong>{workflow.title}</strong>
                      <small>{workflow.description || "No description yet"}</small>
                    </div>
                    <span>{formatDate(workflow.updated_at)}</span>
                    <span className={`ref-pill ${workflow.status === "active" ? "green" : "amber"}`}>{workflow.status}</span>
                    <ArrowRight size={15} />
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No systems yet"
                  copy="Describe the first outcome you want Dobly to own."
                  href="/dashboard/create"
                  action="Create your first system"
                />
              )}
            </section>

            <div className="ref-two">
              <section className="ref-card ref-panel">
                <div className="ref-between"><strong>Recent runs</strong><Link href="/dashboard/workflows/executions">History</Link></div>
                {latestRuns.length ? (
                  <div className="ref-simple-rows">
                    {latestRuns.slice(0, 4).map((run) => (
                      <div className="ref-between" key={run.id}>
                        <span><strong>{workflowTitles[run.workflow_id] || "Operating system"}</strong><small className="ref-muted">{run.status}</small></span>
                        <small className="ref-muted">{formatDate(run.started_at)}</small>
                      </div>
                    ))}
                  </div>
                ) : <p className="ref-muted">Runs will appear after a system starts working.</p>}
              </section>
              <section className="ref-card ref-panel">
                <div className="ref-between"><strong>Dobly recommends</strong><Sparkles size={17} /></div>
                {snapshot.recommendations.length ? (
                  <div className="ref-simple-rows">
                    {snapshot.recommendations.slice(0, 4).map((item) => <div className="ref-between" key={item.title}><span>{item.title}</span><ArrowRight size={14} /></div>)}
                  </div>
                ) : <p className="ref-muted">Recommendations will form as Dobly learns the business.</p>}
              </section>
            </div>
          </div>
        </main>

        <aside className="ref-page-rail ref-stack">
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
