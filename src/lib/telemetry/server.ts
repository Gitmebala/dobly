import "server-only";
import { TELEMETRY_EVENT_OWNERS, TELEMETRY_EVENT_VERSION, type TelemetryEventName } from "@/lib/telemetry/events";

type TelemetryProperties = Record<string, unknown>;

function postHogHost() {
  return (process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
}

export function isTelemetryEnabled() {
  return Boolean(process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export async function captureServerEvent({
  event,
  distinctId,
  properties = {},
}: {
  event: TelemetryEventName;
  distinctId: string;
  properties?: TelemetryProperties;
}) {
  const key = process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !event || !distinctId) return { captured: false, reason: "not_configured" as const };

  try {
    const response = await fetch(`${postHogHost()}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: {
          app: "dobly",
          environment: process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
          source: "server",
          event_version: TELEMETRY_EVENT_VERSION,
          event_owner: TELEMETRY_EVENT_OWNERS[event],
          ...properties,
        },
      }),
      signal: AbortSignal.timeout(2500),
    });
    return { captured: response.ok, status: response.status };
  } catch {
    return { captured: false, reason: "unavailable" as const };
  }
}

export function telemetryReadiness() {
  return {
    posthog: {
      configured: isTelemetryEnabled(),
      browserKey: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
      serverKey: Boolean(process.env.POSTHOG_PROJECT_API_KEY),
      host: postHogHost(),
      autocapture: process.env.NEXT_PUBLIC_POSTHOG_AUTOCAPTURE === "true",
      sessionReplay: process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY === "true",
      consentRequired: process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === "true",
    },
  };
}
