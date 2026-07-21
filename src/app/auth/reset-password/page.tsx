"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { AuthShell, AuthField } from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";
import "../reference-auth.css";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const localToken = searchParams?.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (localToken) {
      setReady(true);
      return;
    }
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then((result: { data?: { session?: unknown } }) => {
      if (result.data?.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [localToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (localToken) {
        const response = await fetch("/api/auth/password/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: localToken, password }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(result.error || "We could not update your password. Please request a new reset link.");
          return;
        }
      } else {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setError("We could not update your password. Please request a new reset link.");
          return;
        }
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
      <AuthShell heading="Password updated">
        <div className="dl-auth-success">
          <span className="dl-auth-success-mark"><CheckCircle2 size={30} /></span>
          <h1>Password updated</h1>
          <p>Your password has been changed. You can sign in with it now.</p>
          <Link href="/auth/login" className="dl-auth-submit">Go to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      heading="Choose a new password"
      subheading="Set a fresh password for your Dobly account."
    >
      {!ready ? (
        <div className="dl-auth-waiting">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for recovery session...
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <AuthField label="New password" icon={<LockKeyhole />}>
            <input
              className="dl-auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 10 characters"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </AuthField>
          {error ? <div className="dl-auth-error" role="alert">{error}</div> : null}
          <button type="submit" disabled={loading || password.length < 10} className="dl-auth-submit">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</> : "Update password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
