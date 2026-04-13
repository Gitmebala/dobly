"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError("We could not update your password. Please request a new reset link.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
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
              <h1 className="font-display text-2xl font-bold text-text">Password updated</h1>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                Your password has been changed successfully.
              </p>
              <Link href="/auth/login" className="btn-primary mt-6">
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-text">Choose a new password</h1>
              <p className="mt-2 text-sm text-text-muted">
                Set a fresh password for your Dobly account.
              </p>

              {!ready ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  Waiting for recovery session...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-display font-medium text-text-muted">
                      New password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input"
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                  </div>

                  {error ? <p className="text-sm text-red-400">{error}</p> : null}

                  <button type="submit" disabled={loading || password.length < 8} className="btn-primary w-full justify-center">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      "Update password"
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
