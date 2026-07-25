"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  FileText,
  HeartHandshake,
  PackageSearch,
  PhoneCall,
  ReceiptText,
  Repeat2,
  Smile,
  Ticket,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const ICONS: Record<string, LucideIcon> = {
  FileText,
  UserRoundPlus,
  CircleDollarSign,
  Repeat2,
  PackageSearch,
  HeartHandshake,
  Ticket,
  ReceiptText,
  PhoneCall,
  CalendarClock,
  Smile,
};

export interface VerticalRosterItem {
  name: string;
  domain: string;
  line: string;
  icon: keyof typeof ICONS;
}

export interface VerticalLandingContent {
  kicker: string;
  headline: string;
  headlineEm: string;
  dek: string;
  roster: VerticalRosterItem[];
  workRecord: { title: string; body: string };
  manifesto: string;
}

export default function VerticalLandingPage({ content }: { content: VerticalLandingContent }) {
  return (
    <main className="dl2">
      <header className="dl2-masthead">
        <div className="dl2-wrap dl2-masthead-row">
          <Link href="/" className="dl2-wordmark" aria-label="Dobly home">
            <span className="dl2-wordmark-mark">D</span>
            <span className="dl2-wordmark-name">Dobly</span>
          </Link>
          <nav className="dl2-mast-nav" aria-label="Main navigation">
            <Link href="/#how">How it works</Link>
            <Link href="/#roster">The roster</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
          <div className="dl2-mast-actions">
            <ThemeToggle compact />
            <Link href="/auth/login" className="dl2-quiet-link">Log in</Link>
            <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl2-btn">Start free</Link>
          </div>
        </div>
      </header>

      <section className="dl2-wrap dl2-hero" style={{ gridTemplateColumns: "1fr" }}>
        <div className="dl2-hero-lede">
          <p className="dl2-kicker">{content.kicker}</p>
          <h1>
            {content.headline}
            <br />
            <em>{content.headlineEm}</em>
          </h1>
          <p className="dl2-dek">{content.dek}</p>
          <div className="dl2-hero-cta">
            <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl2-btn dl2-btn-lg">
              Hire your first Operator <ArrowRight />
            </Link>
            <Link href="/dashboard/workflows/templates" className="dl2-underlink">See workflow templates</Link>
          </div>
        </div>
      </section>

      <section className="dl2-wrap dl2-roster-section">
        <header className="dl2-section-head">
          <span className="dl2-section-index">01</span>
          <h2>Coworkers Dobly can hire here.</h2>
          <p className="dl2-section-dek">
            Describe the outcome and Dobly proposes the coworker. This is the starting roster for the job — not a fixed menu.
          </p>
        </header>
        <ol className="dl2-roster">
          {content.roster.map(({ name, domain, line, icon }, i) => {
            const Icon = ICONS[icon];
            return (
              <li key={name} className="dl2-roster-row">
                <span className="dl2-roster-num">{String(i + 1).padStart(2, "0")}</span>
                <Icon className="dl2-roster-icon" aria-hidden="true" />
                <div className="dl2-roster-body">
                  <h3>{name}</h3>
                  <p>{line}</p>
                </div>
                <span className="dl2-roster-domain">{domain}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="dl2-manifesto">
        <div className="dl2-wrap">
          <p className="dl2-kicker">Why it fits</p>
          <blockquote>{content.manifesto}</blockquote>
        </div>
      </section>

      <section className="dl2-wrap dl2-record">
        <div className="dl2-record-copy">
          <span className="dl2-section-index">02</span>
          <h2>{content.workRecord.title}</h2>
          <p>{content.workRecord.body}</p>
        </div>
      </section>

      <section className="dl2-final">
        <div className="dl2-wrap">
          <h2>Hire your first coworker today.</h2>
          <p>Describe one outcome. Keep it if it earns its place. No card to start.</p>
          <Link href="/auth/signup?next=%2Fdashboard%2Fonboarding" className="dl2-btn dl2-btn-cream dl2-btn-lg">
            Start free <ArrowRight />
          </Link>
        </div>
      </section>

      <footer className="dl2-wrap dl2-colophon" style={{ gridTemplateColumns: "1fr auto" }}>
        <div className="dl2-colophon-brand">
          <Link href="/" className="dl2-wordmark"><span className="dl2-wordmark-mark">D</span><span className="dl2-wordmark-name">Dobly</span></Link>
          <p>The hiring interface for AI coworkers.</p>
        </div>
        <div className="dl2-colophon-col">
          <strong>Product</strong>
          <Link href="/#roster">The roster</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/security">Security</Link>
        </div>
      </footer>
    </main>
  );
}
