"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
// success is handled by a full redirect to onboarding; no in-page success state
import GoogleLogo from "@/components/GoogleLogo";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";
import "../reference-auth.css";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next = searchParams?.get("next");
  const safeNext = next?.startsWith("/") ? next : "/dashboard/onboarding";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Use 10+ characters with upper and lowercase letters, a number, and a symbol.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result?.error || "Failed to create account. Please try again.");
        return;
      }
      window.location.assign(safeNext);
    } catch {
      setError("Authentication service unavailable. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        },
      });

      if (oauthError) {
        console.error("[auth/signup] Google sign-up failed", oauthError);
        setError(oauthError.message);
      }
    } catch (cause) {
      console.error("[auth/signup] Google sign-up threw", cause);
      setError(
        cause instanceof Error
          ? `Google sign-up failed: ${cause.message}`
          : "Google sign-up could not reach the authentication service.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Start free"
      heading="Create your Dobly account"
      subheading="Set up your workspace, then tell Dobly what outcome to own first."
    >
      <button type="button" onClick={handleGoogleSignUp} disabled={loading} className="dl-auth-oauth">
        <GoogleLogo className="h-5 w-5" /> Continue with Google
      </button>
      <div className="dl-auth-divider">or</div>

      <form onSubmit={handleSubmit} noValidate>
        <AuthField label="Full name" icon={<UserRound />}>
          <input className="dl-auth-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your full name" autoComplete="name" required />
        </AuthField>
        <AuthField label="Work email" icon={<Mail />}>
          <input className="dl-auth-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmail((value) => value.trim().toLowerCase())} placeholder="you@company.com" autoComplete="email" required />
        </AuthField>
        <AuthField label="Password" icon={<LockKeyhole />}>
          <input className="dl-auth-input" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a strong password" autoComplete="new-password" required />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="dl-auth-eye" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </AuthField>
        <div className="dl-auth-req">
          <span><CheckCircle2 size={12} /> 10+ characters, mixed case</span>
          <span><CheckCircle2 size={12} /> 1 number</span>
          <span><CheckCircle2 size={12} /> 1 symbol</span>
        </div>
        {error ? <div className="dl-auth-error" role="alert">{error}</div> : null}
        <button type="submit" disabled={loading || !name || !email || !password} className="dl-auth-submit">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : "Create workspace"}
        </button>
      </form>

      <p className="dl-auth-switch">Already have an account? <Link href={`/auth/login?redirect=${encodeURIComponent(safeNext)}`}>Sign in</Link></p>
      <div className="dl-auth-secure"><ShieldCheck size={15} /> By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</div>
    </AuthShell>
  );
}
