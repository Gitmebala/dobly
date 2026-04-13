"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { getProviderFlow, type ConnectionProviderDefinition } from "@/lib/connection-catalog";
import type { PlanId } from "@/types";

export default function ProviderConnectClient({
  provider,
  planId,
}: {
  provider: ConnectionProviderDefinition;
  planId: PlanId;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [developmentHint, setDevelopmentHint] = useState<string | null>(null);

  const { flow, advancedAllowed } = useMemo(() => getProviderFlow(provider, planId), [planId, provider]);

  const visibleFields = showAdvanced && provider.advancedFields?.length ? provider.advancedFields : flow.fields ?? [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setDevelopmentHint(null);

    try {
      if (!showAdvanced && flow.method === "oauth" && flow.oauthHref) {
        window.location.href = flow.oauthHref;
        return;
      }

      if (!showAdvanced && flow.method === "store") {
        const shop = values.shop?.trim();
        if (!shop) {
          setMessage("Enter your Shopify store domain first.");
          return;
        }
        window.location.href = `/api/oauth/shopify/start?shop=${encodeURIComponent(shop)}`;
        return;
      }

      const metadata: Record<string, unknown> = {
        guided: !showAdvanced,
        setup_method: showAdvanced ? "advanced" : flow.method,
        plan_tier: planId,
      };

      for (const [key, value] of Object.entries(values)) {
        if (!["accountIdentifier", "accessToken", "refreshToken", "secret"].includes(key)) {
          metadata[key] = value;
        }
      }

      if (!showAdvanced && flow.method === "otp") {
        const response = await fetch("/api/connections/request-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.id,
            label: values.businessName || values.accountIdentifier || provider.label,
            accountIdentifier: values.accountIdentifier || "",
            metadata,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(data.error ?? `Failed to start ${provider.label} verification.`);
          return;
        }

        setVerificationId(data.verificationId ?? null);
        setDevelopmentHint(data.developmentCodePreview ?? null);
        setMessage(`We sent a 6-digit code to ${values.accountIdentifier}. Enter it below to finish connecting ${provider.label}.`);
        return;
      }

      if (!showAdvanced && flow.method === "email-link") {
        const response = await fetch("/api/connections/request-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.id,
            label: values.accountIdentifier || provider.label,
            accountIdentifier: values.accountIdentifier || "",
            metadata,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(data.error ?? `Failed to send ${provider.label} verification link.`);
          return;
        }

        setDevelopmentHint(data.developmentVerifyUrl ?? null);
        setMessage(`We sent a secure verification link to ${values.accountIdentifier}. Open it once and Dobly will finish the connection automatically.`);
        return;
      }

      const useSecureSetup =
        showAdvanced || (provider.id === "mpesa" && !showAdvanced && flow.method === "guided");

      const response = await fetch(useSecureSetup ? "/api/connections/secure-setup" : "/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useSecureSetup
            ? {
                provider: provider.id,
                label: values.accountIdentifier || provider.label,
                accountIdentifier: values.accountIdentifier || null,
                accessToken: values.accessToken || null,
                refreshToken: values.refreshToken || null,
                secret: values.secret || null,
                metadata,
              }
            : {
                provider: provider.id,
                label: values.accountIdentifier || provider.label,
                accountIdentifier: values.accountIdentifier || null,
                status: flow.method === "otp" || flow.method === "guided" || flow.method === "email-link" ? "pending" : "active",
                metadata,
              }
        ),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? `Failed to start ${provider.label} setup.`);
        return;
      }

      if (!useSecureSetup && flow.method === "guided") {
        setMessage(`${provider.label} setup request saved. Dobly will continue the secure connection flow.`);
      } else {
        setMessage(`${provider.label} connected.`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!verificationId) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/connections/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId,
          code: verificationCode,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "That code is not valid.");
        return;
      }

      setVerificationId(null);
      setVerificationCode("");
      setDevelopmentHint(null);
      setMessage(
        `${provider.label} number verified. Finish the messaging setup before Dobly can send outbound WhatsApp messages.`
      );
      window.setTimeout(() => {
        window.location.href = "/dashboard/settings?tab=connections&success=whatsapp_number_verified";
      }, 700);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dashboard/settings?tab=connections" className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to connections
      </Link>

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="badge-green mb-5">Connect {provider.label}</div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-text">{flow.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">{flow.description}</p>
          </div>
          <div className="badge-muted capitalize">{planId === "free" ? "Starter-style setup" : `${planId} mode`}</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {provider.useCases.map((item) => (
            <span key={item} className="badge-muted">
              {item}
            </span>
          ))}
        </div>

        {!showAdvanced ? (
          <div className="mt-6 rounded-[1rem] border border-accent/20 bg-accent-dim px-4 py-4 text-sm text-text-muted">
            <div className="mb-2 flex items-center gap-2 text-text">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Easy mode
            </div>
            <p>
              No raw API keys. No token fields. No developer terminology. Dobly handles the backend setup for normal people and operators.
            </p>
          </div>
        ) : null}
      </section>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {visibleFields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-xs font-display font-medium uppercase tracking-[0.18em] text-text-dim">
              {field.label}
            </label>
            <input
              type={field.secret ? "password" : "text"}
              value={values[field.key] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              className="input"
              placeholder={field.placeholder}
            />
            {field.help ? <p className="mt-2 text-xs text-text-muted">{field.help}</p> : null}
          </div>
        ))}

        {flow.helper && !showAdvanced ? <p className="text-xs text-text-muted">{flow.helper}</p> : null}

        {message ? (
          <div className="rounded-[1rem] border border-accent/24 bg-accent-dim px-4 py-3 text-sm text-text">
            {message}
          </div>
        ) : null}

        {developmentHint ? (
          <div className="rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-xs text-text-muted">
            Dev preview: {developmentHint}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : flow.method === "oauth" || flow.method === "store" ? (
              <ExternalLink className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {showAdvanced ? `Save ${provider.label} manually` : flow.ctaLabel}
          </button>
          <Link href="/dashboard/settings?tab=connections" className="btn-secondary">
            Cancel
          </Link>
        </div>

        {advancedAllowed ? (
          <div className="border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="btn-ghost"
            >
              {showAdvanced ? "Hide advanced setup" : "Use advanced setup instead"}
            </button>
            <p className="mt-3 text-xs text-text-muted">
              Pro and Agency can still use manual credentials when guided setup is not enough.
            </p>
          </div>
        ) : null}
      </form>

      {verificationId ? (
        <form onSubmit={handleVerifyCode} className="card space-y-4">
          <div className="badge-green">Finish verification</div>
          <h2 className="font-display text-2xl font-semibold text-text">Enter the code from your phone</h2>
          <p className="text-sm leading-7 text-text-muted">
            Dobly sent a one-time code to your WhatsApp number. Enter it once so Dobly can verify ownership and move you to the final messaging setup.
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
            className="input tracking-[0.4em]"
            placeholder="123456"
            maxLength={6}
          />
          <button type="submit" disabled={loading || verificationCode.trim().length < 4} className="btn-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Verify number
          </button>
        </form>
      ) : null}
    </div>
  );
}
