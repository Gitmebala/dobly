"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { getProviderFlow, type ConnectionProviderDefinition } from "@/lib/connection-catalog";
import type { PlanId } from "@/types";

// Polls /api/connections while a popup is open, so a modal-hosted connect
// flow can tell the moment a provider actually goes live — without the
// page ever navigating away, and without touching the OAuth callback
// routes themselves (which still redirect wherever they always did; we
// just stop caring what they show once the popup closes or the
// connection appears, whichever comes first).
function usePopupConnectionWatch(providerId: string, onConnected: () => void) {
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [watching, setWatching] = useState(false);

  function stop() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setWatching(false);
  }

  function open(url: string) {
    const popup = window.open(url, "dobly-connect", "width=560,height=720,noopener,noreferrer");
    popupRef.current = popup;
    setWatching(true);
    pollRef.current = setInterval(async () => {
      if (popup?.closed) {
        // Popup closed - check once more in case the callback landed a
        // beat before the window closed, then give up either way.
        try {
          const response = await fetch("/api/connections", { cache: "no-store" });
          const data = await response.json().catch(() => ({}));
          const connected = (data.connections ?? []).some(
            (c: { provider: string; status: string }) => c.provider === providerId && (c.status === "active" || c.status === "connected"),
          );
          if (connected) onConnected();
        } finally {
          stop();
        }
        return;
      }
      try {
        const response = await fetch("/api/connections", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        const connected = (data.connections ?? []).some(
          (c: { provider: string; status: string }) => c.provider === providerId && (c.status === "active" || c.status === "connected"),
        );
        if (connected) {
          popup?.close();
          onConnected();
          stop();
        }
      } catch {
        // transient - keep polling until the popup closes
      }
    }, 1500);
  }

  useEffect(() => () => stop(), []);

  return { open, watching };
}

export default function ProviderConnectClient({
  provider,
  planId,
  mode = "page",
  onConnected,
}: {
  provider: ConnectionProviderDefinition;
  planId: PlanId;
  /** "modal" keeps the user on the current page: OAuth opens in a popup
   * and connection status is polled instead of relying on a full-page
   * redirect back to /dashboard/connections. */
  mode?: "page" | "modal";
  onConnected?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [developmentHint, setDevelopmentHint] = useState<string | null>(null);
  const popupWatch = usePopupConnectionWatch(provider.id, () => {
    setMessage(`${provider.label} connected.`);
    onConnected?.();
  });

  const { flow, advancedAllowed } = useMemo(() => getProviderFlow(provider, planId), [planId, provider]);

  const visibleFields = showAdvanced && provider.advancedFields?.length ? provider.advancedFields : flow.fields ?? [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setDevelopmentHint(null);

    try {
      if (!showAdvanced && flow.method === "oauth" && flow.oauthHref) {
        if (mode === "modal") {
          setMessage(`Waiting for ${provider.label} in the popup — finish signing in there, this page will update itself.`);
          popupWatch.open(flow.oauthHref);
          return;
        }
        window.location.href = flow.oauthHref;
        return;
      }

      if (!showAdvanced && flow.method === "store") {
        const shop = values.shop?.trim();
        if (!shop) {
          setMessage("Enter your Shopify store domain first.");
          return;
        }
        const storeUrl = `/api/oauth/shopify/start?shop=${encodeURIComponent(shop)}`;
        if (mode === "modal") {
          setMessage(`Waiting for ${provider.label} in the popup — finish signing in there, this page will update itself.`);
          popupWatch.open(storeUrl);
          return;
        }
        window.location.href = storeUrl;
        return;
      }

      // Guided/otp/email-link flows have no OAuth account picker to force the
      // issue, so a required field left blank used to save silently anyway -
      // the connection looked successful but had nothing real behind it.
      const missingField = visibleFields.find((field) => !values[field.key]?.trim());
      if (missingField) {
        setMessage(`Enter ${missingField.label.toLowerCase()} first.`);
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

      const hasSecretField = visibleFields.some((field) => field.secret);
      const useSecureSetup = showAdvanced || (flow.method === "guided" && hasSecretField);

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
                // "guided" flows collect everything they need in one synchronous
                // submit, so they're active immediately. Only otp/email-link stay
                // "pending" - those have a real second step (verify-code,
                // verify-link) that promotes them to active. Nothing promotes a
                // "pending" guided connection, so leaving it pending here made
                // every guided connection permanently invisible to the tool
                // executor, which only runs connections with status active/connected.
                status: flow.method === "otp" || flow.method === "email-link" ? "pending" : "active",
                metadata,
              }
        ),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? `Failed to start ${provider.label} setup.`);
        return;
      }

      // The connections-table row above is just a record of intent - on its
      // own it never buys a number or files the Africa's Talking request, so
      // "connected" would be a lie for Kenya calls/SMS specifically. Chain
      // into the real provisioning backend so the guided form the user
      // actually reaches does the same work the (previously unlinked)
      // /dashboard/connections/phone/provision page does.
      if (!showAdvanced && provider.id === "kenya_local_comms") {
        const provisionResponse = await fetch("/api/business-channels/phone/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: "KE", friendlyName: values.businessName || provider.label }),
        }).catch(() => null);
        const provisionData = await provisionResponse?.json().catch(() => null);
        setMessage(
          provisionResponse?.ok && provisionData?.nextStep
            ? provisionData.nextStep
            : `${provider.label} saved. Dobly will confirm your number setup shortly.`,
        );
        onConnected?.();
        return;
      }

      setMessage(`${provider.label} connected.`);
      onConnected?.();
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
      if (mode === "modal") {
        onConnected?.();
      } else {
        window.setTimeout(() => {
          window.location.href = "/dashboard/connections?success=whatsapp_number_verified";
        }, 700);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={mode === "modal" ? "space-y-5" : "mx-auto max-w-3xl space-y-6"}>
      {mode === "page" ? (
        <Link href="/dashboard/connections" className="btn-ghost inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to access
        </Link>
      ) : null}

      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="badge-green mb-5">Use {provider.label}</div>
            <h1 className={mode === "modal" ? "font-display text-2xl font-bold tracking-tight text-text" : "font-display text-4xl font-bold tracking-tight text-text"}>{flow.title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">{flow.description}</p>
          </div>
          <div className="badge-muted capitalize">{planId === "free" ? "Simple setup" : `${planId} mode`}</div>
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

        <div className="mt-4 rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-text-muted">
          <div className="text-text">Not using {provider.label}?</div>
          <p className="mt-2">
            That is okay. Dobly should adapt to the tools you already have. Go back and choose another option or keep building the setup first.
          </p>
        </div>

        {provider.id === "kenya_local_comms" ? (
          <div className="mt-4 rounded-[1rem] border border-border bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-text-muted">
            <div className="text-text">Need a specific or international number?</div>
            <p className="mt-2">
              This quick setup requests a Kenya number automatically. To search and pick an exact number — including
              international lines — use the full number picker instead.
            </p>
            <Link href="/dashboard/connections/phone/provision" className="btn-secondary mt-3 inline-flex">
              Open number picker
            </Link>
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
          <Link href="/dashboard/connections" className="btn-secondary">
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
              Higher-volume plans can still use manual credentials when guided setup is not enough.
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
