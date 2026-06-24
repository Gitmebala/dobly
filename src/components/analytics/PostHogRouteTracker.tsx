"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    posthog?: {
      capture?: (event: string, properties?: Record<string, unknown>) => void;
      identify?: (distinctId: string, properties?: Record<string, unknown>) => void;
      opt_in_capturing?: () => void;
      opt_out_capturing?: () => void;
      has_opted_in_capturing?: () => boolean;
      has_opted_out_capturing?: () => boolean;
    };
  }
}

type TelemetryIdentity = {
  userId: string | null;
  plan?: string | null;
  workspaceId?: string | null;
};

function RouteTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const requireConsent = process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === "true";

  const url = useMemo(() => {
    const query = searchParams?.toString() ?? "";
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!window.posthog || identityLoaded) return;

    fetch("/api/telemetry/identity", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((identity: TelemetryIdentity | null) => {
        if (identity?.userId) {
          window.posthog?.identify?.(identity.userId, {
            plan: identity.plan,
            workspace_id: identity.workspaceId,
          });
        }
      })
      .catch(() => null)
      .finally(() => setIdentityLoaded(true));
  }, [identityLoaded]);

  useEffect(() => {
    window.posthog?.capture?.("$pageview", {
      $current_url: window.location.href,
      path: pathname,
      url,
    });
  }, [pathname, url]);

  if (!requireConsent) return null;

  return <AnalyticsConsent />;
}

function AnalyticsConsent() {
  const [choice, setChoice] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("dobly.analytics.consent"),
  );

  if (choice) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-xl rounded-[1.1rem] border border-[var(--dobly-border)] bg-[var(--dobly-surface)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
      <div className="text-sm font-semibold text-[var(--dobly-text)]">Help improve Dobly</div>
      <p className="mt-1 text-xs leading-5 text-[var(--dobly-text-muted)]">
        We use product analytics to see what breaks, what confuses people, and which workflows need work.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            window.posthog?.opt_in_capturing?.();
            window.localStorage.setItem("dobly.analytics.consent", "accepted");
            setChoice("accepted");
          }}
          className="rounded-full bg-[var(--dobly-accent)] px-4 py-2 text-xs font-semibold text-white"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => {
            window.posthog?.opt_out_capturing?.();
            window.localStorage.setItem("dobly.analytics.consent", "declined");
            setChoice("declined");
          }}
          className="rounded-full border border-[var(--dobly-border)] px-4 py-2 text-xs font-semibold text-[var(--dobly-text)]"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}

export default function PostHogRouteTracker() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;

  return (
    <Suspense fallback={null}>
      <RouteTrackerInner />
    </Suspense>
  );
}
