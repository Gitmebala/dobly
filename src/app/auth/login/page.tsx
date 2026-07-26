"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import GoogleLogo from "@/components/GoogleLogo";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";
import "../reference-auth.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = searchParams?.get("redirect");
  const safeRedirect = redirectTo?.startsWith("/") ? redirectTo : "/dashboard";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result?.error ?? "Sign in failed. Please try again.");
        return;
      }

      router.push(safeRedirect);
      router.refresh();
    } catch {
      setError("Authentication service unavailable. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
        },
      });

      if (oauthError) {
        console.error("[auth/login] Google sign-in failed", oauthError);
        setError(oauthError.message);
      }
    } catch (cause) {
      // Never swallow this silently: a failure here looks identical to a
      // dead button, which is impossible to diagnose from a bug report.
      console.error("[auth/login] Google sign-in threw", cause);
      setError(
        cause instanceof Error
          ? `Google sign in failed: ${cause.message}`
          : "Google sign in could not reach the authentication service.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      heading="Sign in to Dobly"
      subheading="Continue to your workspace and the work already in motion."
    >
      <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="dl-auth-oauth">
        <GoogleLogo className="h-5 w-5" /> Continue with Google
      </button>
      <div className="dl-auth-divider">or</div>

      <form onSubmit={handleSubmit} noValidate>
        <AuthField label="Email" icon={<Mail />}>
          <input
            className="dl-auth-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setEmail((value) => value.trim().toLowerCase())}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </AuthField>
        <AuthField label="Password" icon={<LockKeyhole />}>
          <input
            className="dl-auth-input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="dl-auth-eye" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </AuthField>

        <div className="dl-auth-meta">
          <label><input type="checkbox" /> Remember me</label>
          <Link href="/auth/forgot-password">Forgot password?</Link>
        </div>
        {error ? <div className="dl-auth-error" role="alert">{error}</div> : null}
        <button type="submit" disabled={loading || !email || !password} className="dl-auth-submit">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign in"}
        </button>
      </form>

      <p className="dl-auth-switch">
        Don&apos;t have an account?{" "}
        <Link href={`/auth/signup?next=${encodeURIComponent(safeRedirect)}`}>Create one</Link>
      </p>
      <div className="dl-auth-secure"><ShieldCheck size={15} /> Secure authentication. Dobly never stores your password.</div>
    </AuthShell>
  );
}
