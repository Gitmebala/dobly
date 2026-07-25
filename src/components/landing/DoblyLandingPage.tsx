"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import HeroField from "@/components/landing/HeroField";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Building2,
  Code2,
  CircleDollarSign,
  FlaskConical,
  Headphones,
  Megaphone,
  MessageCircle,
  Radar,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const EDITION = "Vol. 01 — The hiring interface for AI coworkers";

const intents = [
  { text: "Answer every missed call and book the qualified ones.", role: "Reception Operator", domain: "Customer" },
  { text: "Find our strongest market to expand into next quarter.", role: "Research Analyst", domain: "Intelligence" },
  { text: "Chase the overdue invoices and flag anything unusual.", role: "Finance Operator", domain: "Finance" },
  { text: "Turn this week's launch into a full campaign.", role: "Creative Studio", domain: "Marketing" },
];

const spineSteps = [
  { tag: "Direct", body: "You describe the outcome in plain words. No forms, no flowchart, no configuring." },
  { tag: "Propose", body: "Dobly drafts a coworker for the job: its brief, its tools, the memory it will hold." },
  { tag: "Trial", body: "It does a first piece of real work while you watch. You keep it, or you refine it." },
  { tag: "Hire", body: "The Operator takes the outcome. Routine work runs; consequential work waits for you." },
  { tag: "Improve", body: "Every approval and correction becomes memory the next run already knows." },
];

const roster: Array<{ name: string; domain: string; line: string; icon: LucideIcon }> = [
  { name: "Builder", domain: "Engineering", line: "Writes code, runs the tests, opens the pull request.", icon: Code2 },
  { name: "Product Operator", domain: "Product", line: "Turns a vague ask into a spec and a shipped change.", icon: FlaskConical },
  { name: "Creative Studio", domain: "Marketing", line: "Researches the audience, produces the campaign end to end.", icon: Megaphone },
  { name: "Research Analyst", domain: "Intelligence", line: "Finds the evidence, weighs the options, writes the brief.", icon: Search },
  { name: "Finance Operator", domain: "Finance", line: "Watches cash and margin, reconciles, flags what moved.", icon: CircleDollarSign },
  { name: "Operations Coordinator", domain: "Operations", line: "Keeps schedules, suppliers, and handoffs on time.", icon: Workflow },
  { name: "Customer Operator", domain: "Support", line: "Handles calls, chat, and follow-up across channels.", icon: Headphones },
  { name: "Growth Operator", domain: "Revenue", line: "Qualifies demand and runs outreach to a booked call.", icon: BarChart3 },
  { name: "General Manager", domain: "Leadership", line: "Coordinates the others, escalates only what matters.", icon: Users },
  { name: "Watchtower", domain: "Monitoring", line: "Watches the metrics and commitments that can hurt you.", icon: Radar },
  { name: "Whatever you need", domain: "Custom", line: "Describe a role that isn't here. Dobly composes it.", icon: Settings2 },
];

const capabilities: Array<{ word: string; body: string; icon: LucideIcon }> = [
  { word: "Communicate", body: "Calls, chat, email, and follow-up, in the tone the business actually uses.", icon: MessageCircle },
  { word: "Research", body: "Finds the evidence, compares the options, and writes the brief before you ask.", icon: Search },
  { word: "Create", body: "Documents, campaigns, reports, and drafts, ready for review, not a blank page.", icon: Sparkles },
  { word: "Coordinate", body: "Routes work, chases dependencies, and keeps handoffs from silently dropping.", icon: Workflow },
  { word: "Act", body: "Uses the connected software you already run, inside the boundary you set.", icon: ShieldCheck },
  { word: "Monitor", body: "Watches the business and escalates only what actually needs a decision.", icon: Radar },
];

const departments: Array<{ name: string; outcome: string; trust: string }> = [
  { name: "Reception", outcome: "Answer, qualify, book, and route every inbound moment.", trust: "Approval required" },
  { name: "Sales", outcome: "Qualify leads, follow up, keep pipeline work moving.", trust: "Approval required" },
  { name: "Marketing", outcome: "Plan, draft, repurpose, route content through approval.", trust: "Draft, propose" },
  { name: "Finance", outcome: "Chase invoices, match payments, brief cash risk.", trust: "Human only" },
  { name: "Support", outcome: "Answer FAQs, triage tickets, recover unhappy customers.", trust: "Approval required" },
  { name: "Operations", outcome: "Coordinate tasks, suppliers, orders, and blockers.", trust: "Safe auto-run" },
];

const faqs: Array<[string, string]> = [
  ["Is this just a chatbot with a nicer coat of paint?", "No. Chat is where you talk to your Operators. The work itself, every call, document, reconciliation, and decision, happens underneath and is recorded in that same conversation, dated, so you can read any day like a page."],
  ["Will it act behind my back?", "Only inside the lines you draw. Routine work runs on its own. Anything customer-facing, financial, or otherwise consequential stops and waits for your approval, with the full context attached."],
  ["What can one Operator actually do?", "Communicate, research, write, coordinate, and operate connected software, across engineering, sales, support, finance, and operations. One owns an outcome, not a task."],
  ["Does it learn how my business works?", "Yes. Every policy you approve, example you give, and decision you make becomes memory. The next Operator you hire starts already knowing it."],
];

export default function DoblyLandingPage() {
  useReveal();

  return (
    <main className="dl2">
      <WorldBackdrop />
      <Masthead />
      <Hero />
      <Dispatch />
      <TimeSpine />
      <WorkRecord />
      <Roster />
      <Departments />
      <Manifesto />
      <Ledgerlines />
      <FinalCta />
      <Colophon />
    </main>
  );
}

/* ---------- A persistent, cheap, page-length atmosphere: slow CSS-only
   drifting gradient fields. No JS per frame, no scroll dependency — this
   is what makes it feel like one continuous world instead of a decorated
   hero bolted onto a plain page. ---------- */
function WorldBackdrop() {
  return (
    <div className="dl2-world" aria-hidden="true">
      <span className="dl2-world-orb dl2-world-orb-1" />
      <span className="dl2-world-orb dl2-world-orb-2" />
      <span className="dl2-world-orb dl2-world-orb-3" />
    </div>
  );
}

/* ---------- Reveal-on-scroll (physics easing, reduced-motion aware) ---------- */
function useReveal() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = document.querySelectorAll<HTMLElement>(".dl2-reveal");
    if (reduce) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Masthead() {
  return (
    <header className="dl2-masthead">
      <div className="dl2-wrap dl2-masthead-row">
        <Link href="/" className="dl2-wordmark" aria-label="Dobly home">
          <span className="dl2-wordmark-mark">D</span>
          <span className="dl2-wordmark-name">Dobly</span>
        </Link>
        <nav className="dl2-mast-nav" aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#roster">The roster</a>
          <Link href="/pricing">Pricing</Link>
        </nav>
        <div className="dl2-mast-actions">
          <ThemeToggle compact />
          <Link href="/auth/login" className="dl2-quiet-link">Log in</Link>
          <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl2-btn">Start free</Link>
        </div>
      </div>
      <p className="dl2-edition">{EDITION}</p>
    </header>
  );
}

function Hero() {
  return (
    <section className="dl2-wrap dl2-hero">
      <HeroField />
      <div className="dl2-hero-lede dl2-reveal">
        <p className="dl2-kicker">Hiring, not configuring</p>
        <h1>
          <span className="dl2-hero-line dl2-hero-line-in">Say what you need done.</span>
          <span className="dl2-hero-line dl2-hero-line-in" style={{ transitionDelay: "110ms" }}><em>Dobly hires the coworker</em> who does it.</span>
        </h1>
        <p className="dl2-dek">
          Not a workflow to build. A coworker to hire. Describe the outcome, watch Dobly draft an
          Operator for it, and keep everything it does on one page you can read.
        </p>
        <div className="dl2-hero-cta">
          <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl2-btn dl2-btn-lg">
            Hire your first Operator <ArrowRight />
          </Link>
          <a href="#how" className="dl2-underlink">See how it works</a>
        </div>
      </div>
      <LiveComposer />
    </section>
  );
}

/* ---------- The hero figure: an intent types itself, an Operator assembles ---------- */
function LiveComposer() {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [assembled, setAssembled] = useState(false);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      setTyped(intents[0].text);
      setAssembled(true);
      return;
    }
    let charTimer: number;
    let holdTimer: number;
    let cursor = 0;
    const current = intents[idx].text;
    setTyped("");
    setAssembled(false);

    const typeNext = () => {
      cursor += 1;
      setTyped(current.slice(0, cursor));
      if (cursor < current.length) {
        charTimer = window.setTimeout(typeNext, 34 + Math.random() * 46);
      } else {
        holdTimer = window.setTimeout(() => setAssembled(true), 520);
        holdTimer = window.setTimeout(() => setIdx((i) => (i + 1) % intents.length), 3600);
      }
    };
    charTimer = window.setTimeout(typeNext, 480);
    return () => {
      window.clearTimeout(charTimer);
      window.clearTimeout(holdTimer);
    };
  }, [idx]);

  const active = intents[idx];

  return (
    <figure className="dl2-composer dl2-reveal" aria-hidden="true">
      <div className="dl2-composer-head">
        <span className="dl2-composer-tab">New hire</span>
        <span className="dl2-live"><i />live</span>
      </div>
      <div className="dl2-composer-intent">
        <span className="dl2-composer-label">You say</span>
        <p>{typed}<i className="dl2-caret" /></p>
      </div>
      <div className={`dl2-composer-result ${assembled ? "is-on" : ""}`}>
        <span className="dl2-composer-label">Dobly proposes</span>
        <div className="dl2-composer-op">
          <strong>{active.role}</strong>
          <span>{active.domain}</span>
        </div>
        <ul className="dl2-composer-stack">
          <li>Tools</li><li>Memory</li><li>Guardrails</li><li>A definition of done</li>
        </ul>
      </div>
    </figure>
  );
}

function Dispatch() {
  return (
    <section className="dl2-wrap dl2-dispatch">
      <span className="dl2-dispatch-label dl2-reveal">What a coworker can do</span>
      <div className="dl2-dispatch-grid">
        {capabilities.map(({ word, body, icon: Icon }, i) => (
          <div key={word} className="dl2-dispatch-card dl2-reveal" style={{ transitionDelay: `${i * 60}ms` }}>
            <Icon aria-hidden="true" />
            <strong>{word}</strong>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TimeSpine() {
  return (
    <section id="how" className="dl2-wrap dl2-spine-section">
      <header className="dl2-section-head dl2-reveal">
        <span className="dl2-section-index">01</span>
        <h2>From a sentence to a working coworker.</h2>
      </header>
      <ol className="dl2-spine">
        {spineSteps.map((step, i) => (
          <li key={step.tag} className="dl2-spine-entry dl2-reveal" style={{ transitionDelay: `${i * 70}ms` }}>
            <span className="dl2-spine-node" aria-hidden="true" />
            <div className="dl2-spine-meta">
              <strong>{step.tag}</strong>
              <span>Step {i + 1} of 5</span>
            </div>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WorkRecord() {
  return (
    <section className="dl2-wrap dl2-record">
      <div className="dl2-record-copy dl2-reveal">
        <span className="dl2-section-index">02</span>
        <h2>Everything it does, kept on one page.</h2>
        <p>
          A coworker's whole record lives in its chat: the messages, the calls it made, the drafts
          it wrote, the decisions it paused for. Pick any date and read that day like a page in a
          ledger.
        </p>
        <ul className="dl2-record-points">
          <li><Briefcase aria-hidden="true" /><span>Every run, every draft, every call, dated and searchable.</span></li>
          <li><ShieldCheck aria-hidden="true" /><span>Approvals and rejections become memory the next run reads.</span></li>
        </ul>
      </div>
      <figure className="dl2-plate dl2-reveal">
        <div className="dl2-plate-frame">
          <Image
            src="/dobly-product-onboarding.jpg"
            alt="A Dobly workspace where an owner hires their first Operator"
            width={1366}
            height={577}
            priority
          />
        </div>
        <figcaption>Figure 1. Hiring the first Operator, inside a live workspace.</figcaption>
      </figure>
    </section>
  );
}

function Roster() {
  return (
    <section id="roster" className="dl2-wrap dl2-roster-section">
      <header className="dl2-section-head dl2-reveal">
        <span className="dl2-section-index">03</span>
        <h2>The roster.</h2>
        <p className="dl2-section-dek">
          Hire from these, or describe a role that isn't listed and Dobly builds it around the
          responsibility.
        </p>
      </header>
      <ol className="dl2-roster">
        {roster.map(({ name, domain, line, icon: Icon }, i) => (
          <li key={name} className="dl2-roster-row dl2-reveal" style={{ transitionDelay: `${Math.min(i, 8) * 45}ms` }}>
            <span className="dl2-roster-num">{String(i + 1).padStart(2, "0")}</span>
            <Icon className="dl2-roster-icon" aria-hidden="true" />
            <div className="dl2-roster-body">
              <h3>{name}</h3>
              <p>{line}</p>
            </div>
            <span className="dl2-roster-domain">{domain}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Departments() {
  return (
    <section className="dl2-wrap dl2-depts-section">
      <header className="dl2-section-head dl2-reveal">
        <span className="dl2-section-index">04</span>
        <h2>Fourteen departments, not one chatbot.</h2>
        <p className="dl2-section-dek">
          Every Operator you hire runs inside a real department with its own autonomy boundary.
          Nothing acts past the trust level you've given it.
        </p>
      </header>
      <div className="dl2-depts-grid">
        {departments.map((dept) => (
          <div key={dept.name} className="dl2-dept-card dl2-reveal">
            <div className="dl2-dept-card-top">
              <Building2 aria-hidden="true" />
              <span className="dl2-dept-trust">{dept.trust}</span>
            </div>
            <h3>{dept.name}</h3>
            <p>{dept.outcome}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section className="dl2-manifesto">
      <div className="dl2-wrap dl2-reveal">
        <p className="dl2-kicker">The difference</p>
        <blockquote>
          It does not just tell you what to do. It organizes the intelligence, the tools, and the
          execution to make it happen, then hands you back only the decision.
        </blockquote>
        <p className="dl2-manifesto-sig">One system, from a sentence to completed work.</p>
      </div>
    </section>
  );
}

function Ledgerlines() {
  const [open, setOpen] = useState(0);
  return (
    <section className="dl2-wrap dl2-faq">
      <header className="dl2-section-head dl2-reveal">
        <span className="dl2-section-index">05</span>
        <h2>Straight answers.</h2>
      </header>
      <div className="dl2-faq-list">
        {faqs.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={q} className={`dl2-faq-row dl2-reveal ${isOpen ? "is-open" : ""}`}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
                <span>{q}</span>
                <ArrowUpRight />
              </button>
              <div className="dl2-faq-answer" hidden={!isOpen}><p>{a}</p></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="dl2-final">
      <div className="dl2-wrap dl2-reveal">
        <h2>Hire your first coworker today.</h2>
        <p>Describe one outcome. Keep it if it earns its place. No card to start.</p>
        <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl2-btn dl2-btn-cream dl2-btn-lg">
          Start free <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

function Colophon() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const subscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!response.ok) throw new Error("failed");
      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <footer className="dl2-wrap dl2-colophon">
      <div className="dl2-colophon-brand">
        <Link href="/" className="dl2-wordmark"><span className="dl2-wordmark-mark">D</span><span className="dl2-wordmark-name">Dobly</span></Link>
        <p>The hiring interface for AI coworkers.</p>
      </div>
      <ColophonColumn title="Product" links={[
        { label: "The roster", href: "#roster" },
        { label: "How it works", href: "#how" },
        { label: "Pricing", href: "/pricing" },
        { label: "Security", href: "/security" },
      ]} />
      <ColophonColumn title="Company" links={[
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
        { label: "Contact", href: "mailto:hello@dobly.io" },
      ]} />
      <div className="dl2-colophon-news">
        <strong>Read the next edition</strong>
        <p>Occasional notes on building Dobly.</p>
        <form onSubmit={subscribe}>
          <input
            aria-label="Email address"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            placeholder="you@company.com"
            required
          />
          <button type="submit" disabled={status === "loading"} aria-label="Subscribe"><ArrowRight /></button>
        </form>
        <small aria-live="polite">
          {status === "success" ? "You are on the list." : status === "error" ? "Could not subscribe. Try again." : ""}
        </small>
      </div>
      <p className="dl2-colophon-rule">&copy; 2026 Dobly. All rights reserved.</p>
    </footer>
  );
}

function ColophonColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div className="dl2-colophon-col">
      <strong>{title}</strong>
      {links.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
    </div>
  );
}
