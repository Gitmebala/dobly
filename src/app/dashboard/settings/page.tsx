"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import ConnectionsTab from "@/components/dashboard/ConnectionsTab";
import { PLANS, type PlanId, type Profile } from "@/types";

type Tab = "profile" | "billing" | "connections" | "security";

type BannerState = {
  type: "success" | "error";
  text: string;
} | null;

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("tab") as Tab | null) ?? "profile";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load profile.");
        setProfile(result.profile);
      })
      .finally(() => setLoading(false));
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "connections", label: "Connections", icon: Link2 },
    { id: "security", label: "Security", icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="settings-page mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage your account, plan, connection recovery, and the routes Dobly should use when something needs your attention.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-display font-medium transition-all duration-200 ${
              tab === id
                ? "border border-border bg-surface-1 text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab profile={profile} setProfile={setProfile} />}
      {tab === "billing" && <BillingTab profile={profile} />}
      {tab === "connections" && <ConnectionsTab planId={(profile?.plan ?? "free") as PlanId} />}
      {tab === "security" && <SecurityTab email={profile?.email ?? ""} />}
    </div>
  );
}

function ProfileTab({
  profile,
  setProfile,
}: {
  profile: Profile | null;
  setProfile: (p: Profile) => void;
}) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [notificationPreference, setNotificationPreference] = useState<"app" | "email" | "whatsapp">(
    (profile?.notification_preference as "app" | "email" | "whatsapp" | null) ?? "app",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteAccount() {
    if (deleteConfirmation !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation, reason: deleteReason.trim() || null }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Dobly could not delete this account.");
      window.location.assign("/");
    } catch (deleteFailure) {
      setDeleteError(deleteFailure instanceof Error ? deleteFailure.message : "Dobly could not delete this account.");
      setDeleting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name.trim(), notification_preference: notificationPreference }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Dobly could not save your changes. Please try again.");
    } else {
      setProfile(result.profile as Profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }

    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSave} className="card space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-text">Personal info</h2>
          <p className="mt-1 text-sm text-text-muted">
            Keep your profile current so support, billing, and notifications route cleanly.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-display font-medium text-text-muted">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-display font-medium text-text-muted">Email address</label>
          <input type="email" value={profile?.email ?? ""} className="input cursor-not-allowed opacity-60" disabled />
          <p className="mt-1 text-xs text-text-dim">
            Need to change your login email? Contact support from this address so we can verify the request safely.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-display font-medium text-text-muted">Primary notification channel</label>
          <select
            value={notificationPreference}
            onChange={(e) => setNotificationPreference(e.target.value as "app" | "email" | "whatsapp")}
            className="input"
          >
            <option value="app">In-app</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <p className="mt-1 text-xs text-text-dim">
            Dobly uses this channel for failed runs, approvals, reconnects, and plan pressure alerts.
          </p>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Saved
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </form>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="premium-tile">
          <div className="font-display text-lg font-semibold text-text">Get help fast</div>
          <p className="mt-2 text-sm leading-7 text-text-muted">
            If something is unclear, use the help center to find the right path for workflow fixes, privacy requests, and support.
          </p>
          <Link href="/dashboard/help" className="btn-secondary mt-5">
            Open help
          </Link>
        </div>

        <div className="premium-tile border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <div>
              <div className="font-display text-lg font-semibold text-text">Delete account</div>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                Permanently remove your account, coworkers, work history, and active Dobly access. This cannot be undone.
              </p>
              {!deleteOpen ? (
                <button type="button" onClick={() => setDeleteOpen(true)} className="btn-secondary mt-5 border-red-500/30 text-red-300 hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" /> Delete account
                </button>
              ) : (
                <div className="mt-5 grid gap-3">
                  <textarea
                    className="input min-h-[86px]"
                    value={deleteReason}
                    onChange={(event) => setDeleteReason(event.target.value)}
                    maxLength={1000}
                    placeholder="Optional: tell us why you are leaving"
                    aria-label="Reason for deleting account"
                  />
                  <label className="grid gap-2 text-sm text-text-muted">
                    Type <strong className="text-text">DELETE</strong> to confirm
                    <input
                      className="input"
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  {deleteError ? <p className="text-sm text-red-400" role="alert">{deleteError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleDeleteAccount} disabled={deleteConfirmation !== "DELETE" || deleting} className="btn-secondary border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                      {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting</> : <><Trash2 className="h-4 w-4" /> Permanently delete</>}
                    </button>
                    <button type="button" onClick={() => { setDeleteOpen(false); setDeleteConfirmation(""); setDeleteError(""); }} disabled={deleting} className="btn-ghost">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BillingTab({ profile }: { profile: Profile | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState>(null);
  const currentPlan = useMemo(
    () => PLANS.find((plan) => plan.id === (profile?.plan ?? "free")),
    [profile?.plan],
  );

  async function handleUpgrade(planId: PlanId) {
    setLoading(planId);
    setBanner(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data?.error ?? "Dobly could not start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Dobly could not start checkout. Please try again.",
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("portal");
    setBanner(null);

    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data?.error ?? "Dobly could not open the billing portal.");
      }

      window.location.href = data.url;
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Dobly could not open the billing portal.",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-text">Current plan</h2>
            <p className="mt-1 text-sm text-text-muted">
              You are currently on the <span className="font-medium capitalize text-accent">{profile?.plan ?? "free"}</span> plan.
            </p>
          </div>
          <span className="badge-green capitalize">{profile?.plan ?? "free"}</span>
        </div>

        {currentPlan ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <MetricTile label="Workflow capacity" value={currentPlan.max_workflows === -1 ? "Unlimited" : String(currentPlan.max_workflows)} />
            <MetricTile
              label="Standard executions"
              value={
                currentPlan.max_standard_executions === -1
                  ? "Unlimited"
                  : currentPlan.max_standard_executions.toLocaleString()
              }
            />
            <MetricTile
              label="Monthly price"
              value={
                currentPlan.price_kes
                  ? `KES ${currentPlan.price_kes.toLocaleString()}`
                  : currentPlan.price_usd
                    ? `$${currentPlan.price_usd}`
                    : "Free"
              }
            />
          </div>
        ) : null}

        {banner ? (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              banner.type === "success"
                ? "border-accent/30 bg-accent-dim text-text"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        {profile?.stripe_subscription_id ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={handleManage} disabled={loading === "portal"} className="btn-primary gap-2">
              {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Manage billing
            </button>
            <a href="mailto:billing@dobly.io?subject=Dobly%20billing%20question" className="btn-secondary">
              Email billing support
            </a>
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 font-display text-sm font-semibold text-text">Compare plans</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.filter((plan) => plan.id !== "free").map((plan) => {
            const isCurrent = plan.id === profile?.plan;

            return (
              <div
                key={plan.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 ${
                  plan.highlight
                    ? "border-accent/40 bg-surface-2 shadow-[0_0_20px_rgba(79,70,229,0.12)]"
                    : "border-border bg-surface-1 hover:border-border-bright"
                }`}
              >
                {plan.badge ? <span className="badge-green self-start text-xs">{plan.badge}</span> : null}
                <div>
                  <div className="font-display text-sm font-semibold text-text">{plan.name}</div>
                  <div className="mt-0.5 font-display text-xl font-bold text-text">
                    {plan.price_kes
                      ? `KES ${plan.price_kes.toLocaleString()}`
                      : plan.price_usd
                        ? `$${plan.price_usd}`
                        : "Free"}
                    <span className="ml-1 font-body text-xs font-normal text-text-muted">/mo</span>
                  </div>
                </div>
                <div className="text-xs leading-6 text-text-muted">{plan.features.slice(0, 2).join(" • ")}</div>
                {isCurrent ? (
                  <div className="badge-muted justify-center">Current plan</div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id as PlanId)}
                    disabled={loading !== null}
                    className={`w-full justify-center py-2 text-xs ${plan.highlight ? "btn-primary" : "btn-secondary"}`}
                  >
                    {loading === plan.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        {profile?.plan === "free" ? "Upgrade" : "Switch plan"}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="font-display text-xl font-semibold text-text">Billing help</h3>
        <p className="mt-2 text-sm leading-7 text-text-muted">
          For invoices, cancellations, plan changes, or anything that feels unclear, contact billing support and include the email on the account.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/pricing" className="btn-secondary">
            Compare plans in detail
          </Link>
          <a href="mailto:billing@dobly.io?subject=Dobly%20billing%20help" className="btn-ghost">
            <Mail className="h-4 w-4" />
            Contact billing
          </a>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ email }: { email: string }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<BannerState>(null);

  async function handlePasswordResetEmail(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/auth/password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage({ type: "error", text: result.error || "Dobly could not create a reset link right now." });
    } else {
      setMessage({
        type: "success",
        text: result.resetUrl
          ? "A local reset link is ready. Open Forgot password from the sign-in page to use it."
          : `Password reset email sent to ${email}.`,
      });
    }

    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handlePasswordResetEmail} className="card space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-text">Password reset</h2>
          <p className="mt-1 text-sm text-text-muted">
            For safety, Dobly sends a reset link to your email instead of changing the password directly in the dashboard.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
          Reset email destination: <span className="text-text">{email || "No email found"}</span>
        </div>

        {message ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-accent/30 bg-accent-dim text-text"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <button type="submit" disabled={saving || !email} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending
            </>
          ) : (
            "Send password reset email"
          )}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-display text-lg font-semibold text-text">Trust and privacy</h3>
          <p className="mt-2 text-sm leading-7 text-text-muted">
            Review how Dobly handles security disclosures, privacy requests, and operational data before you connect more systems.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/security" className="btn-secondary">
              Security
            </Link>
            <Link href="/privacy" className="btn-ghost">
              Privacy
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold text-text">Data and account requests</h3>
          <p className="mt-2 text-sm leading-7 text-text-muted">
            Need help with account access, deletion, or a data request? Route it through support so Dobly can verify ownership first.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="mailto:hello@dobly.io?subject=Dobly%20account%20request" className="btn-secondary">
              Email support
            </a>
            <Link href="/dashboard/help" className="btn-ghost">
              Help center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4">
      <div className="text-xs uppercase tracking-[0.18em] text-text-dim">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold text-text">{value}</div>
    </div>
  );
}
