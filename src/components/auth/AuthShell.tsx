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
      <section className="dl-auth-main">
        <header className="dl-auth-topbar">
          <Link href="/" className="dl-auth-brand" aria-label="Dobly home">
            <span className="dl-auth-brand-mark">D</span>
            <span className="dl-auth-brand-name">Dobly</span>
          </Link>
          <div className="dl-auth-topbar-actions">
            <ThemeToggle compact />
            <Link href="/" className="dl-auth-back"><ArrowLeft size={16} /> Back to home</Link>
          </div>
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
