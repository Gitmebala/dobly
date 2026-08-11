"use client";

// No-auth preview of ConnectionsTab's new mode="modal" — this is exactly
// what OnboardingWizard's "Connect one place where work happens" step now
// renders, so a provider tile opens ConnectProviderModal in place instead
// of navigating to /dashboard/connect/[provider] and back. Dev-only, never
// linked from product navigation. See memory: dobly-canvas-table-rebuild.
import { useEffect } from "react";
import ConnectionsTab from "@/components/dashboard/ConnectionsTab";
import "@/app/dashboard/reference-app.css";

export default function ConnectionsModalPreviewPage() {
  useEffect(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/connections") && (!init || init.method === undefined || init.method === "GET")) {
        return new Response(
          JSON.stringify({
            connections: [{ id: "c1", provider: "google", label: "Gmail", status: "active" }],
            launchReadyProviderIds: ["google", "whatsapp", "kenya_local_comms"],
            optionalLaunchProviderIds: ["slack"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return realFetch(input, init);
    };
    return () => {
      window.fetch = realFetch;
    };
  }, []);

  return (
    <div className="dashboard-shell app-shell" style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <ConnectionsTab
          planId="free"
          mode="modal"
          launchReadyProviderIds={["google", "whatsapp", "kenya_local_comms"]}
          optionalLaunchProviderIds={["slack"]}
        />
      </div>
    </div>
  );
}
