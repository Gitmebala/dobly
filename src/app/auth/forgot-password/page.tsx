"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
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

  return (
    <main className="reference-auth">
      <div className="reference-auth__frame">
        <div className="reference-auth__panel">
          <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo className="justify-center" markClassName="h-10 w-10" wordmarkClassName="text-xl" />
        </div>

        <div className="card">
          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-dim text-accent">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="font-display text-2xl font-bold text-text">Check your email</h1>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                {resetUrl
                  ? "This local demo does not send email. Use the secure one-time link below."
                  : <>We sent a password reset link to <span className="text-text">{email}</span>.</>}
              </p>
              {resetUrl ? <Link href={resetUrl} className="btn-primary mt-6">Reset password</Link> : null}
              <Link href="/auth/login" className="btn-secondary mt-6">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-text">Reset your password</h1>
              <p className="mt-2 text-sm text-text-muted">
                Enter your email and we will send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-display font-medium text-text-muted">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                {error ? <p className="text-sm text-red-400">{error}</p> : null}

                <button type="submit" disabled={loading || !email} className="btn-primary w-full justify-center">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="mt-5 text-sm text-text-muted">
                Remembered it?{" "}
                <Link href="/auth/login" className="text-accent">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
        </div>
      </div>
    </main>
  );
}
