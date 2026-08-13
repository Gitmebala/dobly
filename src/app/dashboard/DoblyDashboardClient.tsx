"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  Bell,
  Calendar,
  Mail,
  Play,
  Plus,
  Rocket,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  whatNeedsAttention: { text: string; href: string }[];
};

const MATERIALS = ["paper", "clay", "stone", "slate"] as const;

const STARTERS = [
  { label: "Launch my product", icon: Rocket, prompt: "Help me launch my product" },
  { label: "Research this market", icon: Search, prompt: "Research my market and competitors" },
  { label: "Automate lead outreach", icon: Mail, prompt: "Automate outreach to new leads" },
  { label: "Plan my week", icon: Calendar, prompt: "Plan my week and flag what needs my attention" },
];

// The handwritten note at the top changes with the hour, so the canvas
// feels lived-in rather than a static mockup. A few options per bracket
// so reloading doesn't always land on the same line.
const ANNOTATIONS: Array<{ from: number; to: number; lines: [string, string][] }> = [
  { from: 0, to: 4, lines: [["Midnight grind.", "Dobly's up too."], ["The quiet hours.", "Good ones for big ideas."], ["Still awake?", "Let's make it count."]] },
  { from: 4, to: 7, lines: [["Up before the sun.", "Dobly handles the rest."], ["Early bird energy.", "Let's use it."]] },
  { from: 7, to: 11, lines: [["Start with anything.", "Dobly handles the rest."], ["Fresh start.", "What are we building today?"], ["Coffee's on.", "Let's move."]] },
  { from: 11, to: 14, lines: [["Midday momentum.", "Keep it going."], ["Halfway through.", "Dobly's still on it."]] },
  { from: 14, to: 18, lines: [["Afternoon push.", "Let's close things out."], ["Second wind.", "Dobly handles the rest."]] },
  { from: 18, to: 22, lines: [["Winding down —", "or one more thing?"], ["Golden hour.", "Let's get it done."], ["Evening shift.", "Dobly's on the clock."]] },
  { from: 22, to: 24, lines: [["Late one tonight.", "Dobly doesn't mind."], ["Night owl mode.", "What's on your mind?"]] },
];

function pickAnnotation(hour: number): [string, string] {
  const bracket = ANNOTATIONS.find((b) => hour >= b.from && hour < b.to) ?? ANNOTATIONS[2];
  return bracket.lines[Math.floor(Math.random() * bracket.lines.length)];
}

export default function DoblyDashboardClient({
  recentLoops,
  latestApprovals,
  snapshot,
  onboarding,
  firstName,
  team = [],
  runsThisWeek = 0,
  completedRunsThisWeek = 0,
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
    skipped?: boolean;
  };
  firstName?: string;
  team?: TeamMember[];
  signalSummary?: SignalSummary;
  pulseScore?: number;
  runsThisWeek?: number;
  completedRunsThisWeek?: number;
  justOnboarded?: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [showWelcome, setShowWelcome] = useState(justOnboarded);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const name = firstName || "there";
  const setupComplete = (onboarding.hasBusinessContext && onboarding.hasConnection && onboarding.hasWorkflow) || Boolean(onboarding.skipped);

  // Real coworkers, deduped by id (defensive — a merged team list from
  // multiple sources shouldn't ever render the same person twice).
  const uniqueTeam = useMemo(() => Array.from(new Map(team.map((member) => [member.id, member])).values()), [team]);

  // Deterministic default on first paint (server and client agree, no
  // hydration mismatch — see dobly-silent-success-bugs on Date/locale
  // drift); swapped for a time-aware, varied line right after mount so
  // the canvas feels alive rather than a fixed mockup string.
  const [annotation, setAnnotation] = useState<[string, string]>(["Start with anything.", "Dobly handles the rest."]);
  useEffect(() => {
    setAnnotation(pickAnnotation(new Date().getHours()));
  }, []);

  function submitWork() {
    const value = prompt.trim();
    if (!value) return;
    router.push(`/dashboard/generate?prompt=${encodeURIComponent(value)}`);
  }

  const suggestion = useMemo(() => {
    if (!setupComplete) {
      return {
        text: "Dobly still needs a little context before it can do trustworthy work on its own.",
        href: "/dashboard/onboarding",
        cta: "Finish setup",
      };
    }
    if (latestApprovals.length) {
      return {
        text: `${latestApprovals[0].title || latestApprovals[0].message} is waiting on your decision.`,
        href: "/dashboard/approvals",
        cta: "Review",
      };
    }
    if (snapshot.recommendations.length) {
      return { text: snapshot.recommendations[0].title, href: "/dashboard/coworkers", cta: "View plan" };
    }
    if (snapshot.whatNeedsAttention.length) {
      const top = snapshot.whatNeedsAttention[0];
      return { text: top.text, href: top.href, cta: "Take a look" };
    }
    return null;
  }, [setupComplete, latestApprovals, snapshot]);

  const focusItems = snapshot.whatNeedsAttention.slice(0, 3);

  return (
    <div className="canvas-page">
      <div className="canvas-topbar">
        <Link href="/dashboard/notifications" className="canvas-icon-btn" aria-label="Notifications">
          <Bell size={17} />
        </Link>
        <Link href="/dashboard/coworkers?create=true" className="canvas-icon-btn is-accent" aria-label="Start something new">
          <Plus size={19} />
        </Link>
      </div>

      {showWelcome ? (
        <div className="canvas-welcome-banner dobly-anim-rise">
          <Sparkles size={16} />
          <span>Your workspace is live, {name}. This is your Canvas — everything your team does shows up here from now on.</span>
          <button type="button" onClick={() => setShowWelcome(false)}>Got it</button>
        </div>
      ) : null}

      <section className="canvas-hero">
        <div className="canvas-hero-main">
          <p className="canvas-annotation">
            {annotation[0]}<br />{annotation[1]}
            <svg className="canvas-annotation-arrow" viewBox="0 0 52 34" fill="none" aria-hidden="true">
              <path d="M4 3 C 12 20, 28 26, 46 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M36 15 L47 20 L40 29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </p>

          <h1 className="canvas-heading">
            What needs<br />to get <span className="accent">done?</span>
          </h1>

          <div className="canvas-command">
            <Sparkles />
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitWork();
              }}
              placeholder="Describe what you want to get done…"
              aria-label="Tell Dobly what to handle"
            />
            <button type="button" onClick={submitWork} disabled={!prompt.trim()} aria-label="Send to Dobly">
              <ArrowUp size={18} />
            </button>
          </div>

          <div className="canvas-starters">
            <span className="canvas-starters-label">Try these <ArrowRight size={13} style={{ display: "inline", verticalAlign: "middle" }} /></span>
            {STARTERS.map((starter) => {
              const Icon = starter.icon;
              return (
                <button type="button" key={starter.label} className="canvas-chip" onClick={() => setPrompt(starter.prompt)}>
                  <Icon /> {starter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Real proof of work, not a vanity number — once there's a real
            week of activity, this replaces the generic intro card instead
            of burying the count in a footnote. No fabricated "hours
            saved": time_saved_minutes is permanently 0 for every current
            coworker (nothing ever computes it — see DoblyDashboardPage.tsx),
            so this shows what's actually true instead: real completed
            runs, honestly counted. */}
        {runsThisWeek > 0 ? (
          <aside className="canvas-assist-card canvas-proof-card">
            <Sparkles />
            <p className="canvas-proof-figure">{completedRunsThisWeek}<span> of {runsThisWeek} run{runsThisWeek === 1 ? "" : "s"} completed this week</span></p>
            <p className="canvas-proof-sub">
              {uniqueTeam.filter((m) => m.status === "active").length || 0} coworker{uniqueTeam.filter((m) => m.status === "active").length === 1 ? "" : "s"} on the clock.
            </p>
            <Link href="/dashboard/activity"><Play size={13} /> See what happened</Link>
          </aside>
        ) : (
          <aside className="canvas-assist-card">
            <Sparkles />
            <p><strong>Dobly is here to work with you.</strong><br />I can plan, research, build, write, automate and more.</p>
            <Link href="/dashboard/help"><Play size={13} /> How it works</Link>
          </aside>
        )}
      </section>

      <section className="work-table" aria-label="Your work table">
        <div className="work-table-head">
          <span className="work-table-label">Your work table <ArrowRight size={14} style={{ display: "inline", verticalAlign: "middle" }} /></span>
        </div>

        <div className="work-table-row">
          {uniqueTeam.map((member, index) => (
            <Link
              key={member.id}
              href={`/dashboard/coworkers?operatorId=${member.id}`}
              className="work-tile"
              data-material={MATERIALS[index % MATERIALS.length]}
            >
              <Badge variant="secondary" className="work-tile-badge">{member.status === "active" ? "Active" : member.status}</Badge>
              <div className="work-tile-body">
                <h3 className="work-tile-title">{member.name}</h3>
                <span className="work-tile-meta">{member.mission}</span>
              </div>
              <div className="work-tile-foot">
                <Avatar size="sm" className="work-tile-avatar" aria-hidden="true">
                  <AvatarFallback>{member.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="work-tile-meta">
                  {member.loopCount ? `${member.loopCount} loop${member.loopCount === 1 ? "" : "s"} · ` : ""}
                  {member.status === "active"
                    ? member.lastRunAt ? `active ${formatDate(member.lastRunAt)}` : "ready"
                    : member.status}
                </span>
              </div>
            </Link>
          ))}
          {/* Nothing hired yet: one honest invitation, not placeholder
              names/details standing in for work that hasn't happened. */}
          <Link href="/dashboard/coworkers?create=true" className="work-tile-add">
            <span className="plus"><Plus size={16} /></span>
            <strong>{uniqueTeam.length ? "New workspace" : "Create your first Operator"}</strong>
            <small>{uniqueTeam.length ? "Or describe a job to Dobly above" : "Describe the job and Dobly proposes who should do it"}</small>
          </Link>
        </div>

        {suggestion && !suggestDismissed ? (
          <div className="dobly-suggest-bar">
            <span className="suggest-mark"><Sparkles /> dobly</span>
            <p>{suggestion.text}</p>
            <Link href={suggestion.href}>{suggestion.cta} <ArrowRight size={13} /></Link>
            <button type="button" className="dismiss" onClick={() => setSuggestDismissed(true)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ) : null}
      </section>

      <div className="canvas-footrow">
        <div className="sticky-note">
          <h4>Today's focus</h4>
          {focusItems.length ? (
            <ul>
              {focusItems.map((item) => (
                <li key={item.text}>
                  <Link href={item.href}>{item.text}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul><li>Nothing urgent — pick something above.</li></ul>
          )}
        </div>

        {recentLoops.length ? (
          <div className="home-list" style={{ flex: 1, minWidth: 0 }}>
            {recentLoops.slice(0, 4).map((loop) => (
              <Link className="home-list-row" href={`/dashboard/coworkers?operatorId=${loop.operatorId}`} key={loop.id}>
                <span className="home-list-main"><strong>{loop.name}</strong><small>{loop.operatorName}</small></span>
                <span className="home-list-meta"><em data-status={loop.status}>{loop.status}</em><time>{formatDate(loop.updatedAt)}</time></span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
