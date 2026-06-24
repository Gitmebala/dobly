"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import GoogleLogo from "@/components/GoogleLogo";
import "../reference-auth.css";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
    setError("Google sign-up will be enabled when the production auth project is connected. Use email for this local build.");
  }

  if (success) {
    return (
      <main className="reference-auth">
        <div className="reference-auth__frame">
          <header className="reference-auth__header">
            <BrandLogo href="/" className="reference-auth__logo" markClassName="h-10 w-10" wordmarkClassName="text-2xl" />
          </header>
          <section className="reference-auth__panel">
            <div className="reference-auth__card reference-auth__success">
              <CheckCircle2 size={50} />
              <h1>Check your email</h1>
              <p>We sent a confirmation link to <strong>{email}</strong>. Open it to activate your workspace.</p>
              <Link href={`/auth/login?redirect=${encodeURIComponent(safeNext)}`} className="reference-auth__submit">Back to sign in</Link>
            </div>
          </section>
          <AuthFooter />
        </div>
      </main>
    );
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
              <span>Start free</span>
              <h1>Create your Dobly account</h1>
              <p>Set up your workspace, then tell Dobly what outcome to own first.</p>
            </div>

            <button type="button" onClick={handleGoogleSignUp} disabled={loading} className="reference-auth__oauth">
              <GoogleLogo className="h-5 w-5" /> Continue with Google
            </button>
            <div className="reference-auth__divider">or</div>

            <form onSubmit={handleSubmit} noValidate>
              <AuthField label="Full name" icon={<UserRound />}>
                <input className="reference-auth__input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your full name" autoComplete="name" required />
              </AuthField>
              <AuthField label="Work email" icon={<Mail />}>
                <input className="reference-auth__input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmail((value) => value.trim().toLowerCase())} placeholder="you@company.com" autoComplete="email" required />
              </AuthField>
              <AuthField label="Password" icon={<LockKeyhole />}>
                <input className="reference-auth__input" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a strong password" autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="reference-auth__eye" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </AuthField>
              <div className="reference-auth__requirements">
                <span><CheckCircle2 size={12} /> 10+ characters with mixed case, a number, and a symbol</span>
                <span><CheckCircle2 size={12} /> 1 number</span>
                <span><CheckCircle2 size={12} /> 1 special character</span>
              </div>
              {error ? <div className="reference-auth__error" role="alert">{error}</div> : null}
              <button type="submit" disabled={loading || !name || !email || !password} className="reference-auth__submit">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : "Create workspace"}
              </button>
            </form>

            <p className="reference-auth__switch">Already have an account? <Link href={`/auth/login?redirect=${encodeURIComponent(safeNext)}`}>Sign in</Link></p>
            <div className="reference-auth__secure"><ShieldCheck size={15} /> By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</div>
          </div>
        </section>

        <AuthFooter />
      </div>
    </main>
  );
}

function AuthField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="reference-auth__field"><label>{label}</label><div className="reference-auth__input-wrap">{icon}{children}</div></div>;
}

function AuthFooter() {
  return <footer className="reference-auth__footer"><span>© 2026 Dobly</span><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></footer>;
}
