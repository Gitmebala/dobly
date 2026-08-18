"use client";

// No-auth preview of the real TeachSkillFlow stepper. Stubs the POST so the
// real, unmodified component runs through all 4 steps end to end.
import { useEffect, useState } from "react";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import { TeachSkillFlow } from "@/components/dashboard/TeachSkillFlow";
import "@/app/dashboard/reference-app.css";

const MOCK_COWORKERS = [{ id: "op-1", name: "Maya" }, { id: "op-2", name: "Dex" }];

export default function SkillsDesignPreviewPage() {
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  useEffect(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/skills") && (init?.method ?? "GET") === "POST") {
        setLog(String(init?.body ?? ""));
        return new Response(JSON.stringify({ skill: { id: "skill-new" } }), { status: 201 });
      }
      return realFetch(input, init);
    };
    setReady(true);
    return () => { window.fetch = realFetch; };
  }, []);

  if (!ready) return null;

  return (
    <DashboardWorkspace profile={{ full_name: "Michael", email: "michael@dobly.io" }} isAdmin={false} workspaces={[]} activeWorkspaceId={null}>
      <div className="mx-auto max-w-2xl space-y-4">
        <TeachSkillFlow coworkers={MOCK_COWORKERS} />
        {log ? (
          <section className="card">
            <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--app-muted)" }}>Intercepted POST body</strong>
            <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: "pre-wrap", color: "var(--app-text)" }}>{log}</pre>
          </section>
        ) : null}
      </div>
    </DashboardWorkspace>
  );
}
