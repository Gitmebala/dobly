"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-accent"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          setError("An account with this email already exists.");
        } else {
          setError("Failed to create account. Please try again.");
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-shell min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-glow-gradient opacity-50" />
        <div className="relative text-center max-w-md">
          <div className="w-16 h-16 bg-accent-dim rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/30">
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </div>
          <h1 className="font-display font-bold text-2xl text-text mb-3">
            Check your email
          </h1>
          <p className="text-text-muted mb-6">
            We sent a confirmation link to{" "}
            <span className="text-accent">{email}</span>. Click it to activate
            your account and start automating.
          </p>
          <Link href="/auth/login" className="btn-secondary">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="fixed inset-0 bg-glow-gradient opacity-50" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo
            className="justify-center"
            markClassName="h-10 w-10 drop-shadow-[0_0_20px_rgba(79,70,229,0.35)]"
            wordmarkClassName="text-xl"
          />
        </div>

        <div className="bg-surface-1 border border-border rounded-2xl p-8 shadow-2xl">
          <h1 className="font-display font-bold text-2xl text-text mb-1">
            Start automating free
          </h1>
          <p className="text-text-muted text-sm mb-8">
            3 workflows free · No credit card · Setup in 2 minutes
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-display font-medium text-text-muted mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Amina Oduya"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-xs font-display font-medium text-text-muted mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-medium text-text-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength
                            ? (strengthColors[passwordStrength] ?? "bg-border")
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-dim">
                    {strengthLabels[passwordStrength]}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full justify-center mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create free account"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text-dim mt-6">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-text-muted hover:text-text">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-text-muted hover:text-text">Privacy Policy</Link>
            {" "}, plus our{" "}
            <Link href="/cookies" className="text-text-muted hover:text-text">Cookie Notice</Link>.
          </p>

          <p className="text-center text-sm text-text-muted mt-4">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
