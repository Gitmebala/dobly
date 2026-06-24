"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import GoogleLogo from "@/components/GoogleLogo";
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

      if (oauthError) setError(oauthError.message);
    } catch {
      setError("Google sign in could not reach the authentication service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reference-auth">
      <div className="reference-auth__frame">
        <header className="reference-auth__header">
          <BrandLogo href="/" className="reference-auth__logo" markClassName="h-10 w-10" wordmarkClassName="text-2xl" />
          <Link href="/" className="reference-auth__back"><ArrowLeft size={16} /> Back to home</Link>
        </header>

        <section className="reference-auth__panel">
          <div className="reference-auth__card">
            <div className="reference-auth__intro">
              <span>Welcome back</span>
              <h1>Sign in to Dobly</h1>
              <p>Continue to your workspace and the work already in motion.</p>
            </div>

            <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="reference-auth__oauth">
              <GoogleLogo className="h-5 w-5" /> Continue with Google
            </button>
            <div className="reference-auth__divider">or</div>

            <form onSubmit={handleSubmit} noValidate>
              <AuthField label="Email" icon={<Mail />}>
                <input
                  className="reference-auth__input"
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
                  className="reference-auth__input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="reference-auth__eye" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </AuthField>

              <div className="reference-auth__meta">
                <label><input type="checkbox" /> Remember me</label>
                <Link href="/auth/forgot-password">Forgot password?</Link>
              </div>
              {error ? <div className="reference-auth__error" role="alert">{error}</div> : null}
              <button type="submit" disabled={loading || !email || !password} className="reference-auth__submit">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign in"}
              </button>
            </form>

            <p className="reference-auth__switch">
              Don&apos;t have an account?{" "}
              <Link href={`/auth/signup?next=${encodeURIComponent(safeRedirect)}`}>Create one</Link>
            </p>
            <div className="reference-auth__secure"><ShieldCheck size={15} /> Secure authentication. Dobly never stores your password.</div>
          </div>
        </section>

        <footer className="reference-auth__footer">
          <span>&copy; 2026 Dobly</span>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </div>
    </main>
  );
}

function AuthField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="reference-auth__field"><label>{label}</label><div className="reference-auth__input-wrap">{icon}{children}</div></div>;
}
