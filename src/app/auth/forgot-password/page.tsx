"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";
import "../reference-auth.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error || "We could not prepare the reset link. Please try again.");
        return;
      }

      setResetUrl(result.resetUrl || "");
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell heading="Check your email">
        <div className="dl-auth-success">
          <span className="dl-auth-success-mark"><CheckCircle2 size={30} /></span>
          <h1>Check your email</h1>
          <p>
            {resetUrl
              ? "This local demo does not send email. Use the secure one-time link below."
              : <>We sent a password reset link to <strong>{email}</strong>.</>}
          </p>
          {resetUrl ? <Link href={resetUrl} className="dl-auth-submit">Reset password</Link> : null}
          <Link href="/auth/login" className="dl-auth-secondary">Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      heading="Reset your password"
      subheading="Enter your email and we will send you a secure reset link."
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthField label="Email address" icon={<Mail />}>
          <input
            className="dl-auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </AuthField>
        {error ? <div className="dl-auth-error" role="alert">{error}</div> : null}
        <button type="submit" disabled={loading || !email} className="dl-auth-submit">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending reset link...</> : "Send reset link"}
        </button>
      </form>

      <p className="dl-auth-switch">Remembered it? <Link href="/auth/login">Sign in</Link></p>
    </AuthShell>
  );
}
