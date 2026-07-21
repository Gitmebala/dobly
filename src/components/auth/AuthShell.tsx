"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export function AuthShell({
  eyebrow,
  heading,
  subheading,
  children,
}: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="dl-auth">
      <aside className="dl-auth-aside">
        <div className="dl-auth-aside-top">
          <Link href="/" className="dl-auth-brand" aria-label="Dobly home">
            <span className="dl-auth-brand-mark">D</span>
            <span className="dl-auth-brand-name">Dobly</span>
          </Link>
          <p className="dl-auth-edition">Vol. 01 — The hiring interface for AI coworkers</p>
        </div>

        <div className="dl-auth-aside-body">
          <h2>Hire the coworker.<br />Keep the work on one page.</h2>
          <ol className="dl-auth-ledger">
            <li><span>01</span><p>Describe an outcome. Dobly drafts the Operator for it.</p></li>
            <li><span>02</span><p>Watch a first piece of real work before you commit.</p></li>
            <li><span>03</span><p>Everything it does stays recorded, dated, and yours.</p></li>
          </ol>
        </div>

        <p className="dl-auth-aside-foot">Set the standard. Dobly runs the rest.</p>
      </aside>

      <section className="dl-auth-main">
        <header className="dl-auth-topbar">
          <Link href="/" className="dl-auth-back"><ArrowLeft size={16} /> Back to home</Link>
          <ThemeToggle compact />
        </header>

        <div className="dl-auth-form-wrap">
          <div className="dl-auth-form">
            <div className="dl-auth-intro">
              {eyebrow ? <span className="dl-auth-eyebrow">{eyebrow}</span> : null}
              <h1>{heading}</h1>
              {subheading ? <p>{subheading}</p> : null}
            </div>
            {children}
          </div>
        </div>

        <footer className="dl-auth-foot">
          <span>&copy; 2026 Dobly</span>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </section>
    </main>
  );
}

export function AuthField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="dl-auth-field">
      <label>{label}</label>
      <div className="dl-auth-input-wrap">
        {icon}
        {children}
      </div>
    </div>
  );
}
