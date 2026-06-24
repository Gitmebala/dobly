"use client";

import { useReportWebVitals } from "next/web-vitals";

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!window.location.pathname.startsWith("/dashboard")) return;
    const consentRequired = process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === "true";
    if (consentRequired && window.localStorage.getItem("dobly.analytics.consent") !== "accepted") return;
    const body = JSON.stringify({
      event: "web_vital",
      properties: { name: metric.name, value: metric.value, rating: metric.rating, navigation: metric.navigationType },
    });
    if (!navigator.sendBeacon?.("/api/telemetry/event", new Blob([body], { type: "application/json" }))) {
      fetch("/api/telemetry/event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
    }
  });
  return null;
}
