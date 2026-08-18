"use client";

// No-auth preview of the real GroupRoom + CreateGroupDrawer components.
// Stubs the group-message POST with a realistic multi-operator turn
// (one operator replies, one skips) so the REAL sequential-turn UI runs
// end to end without needing a live session or real Anthropic calls.
import { useEffect, useState } from "react";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import { CreateGroupDrawer } from "@/components/dashboard/CreateGroupDrawer";
import { GroupRoom } from "@/components/dashboard/GroupRoom";
import "@/app/dashboard/reference-app.css";

const MOCK_COWORKERS = [
  { id: "op-1", name: "Maya", mission: "Answer customer emails within the hour." },
  { id: "op-2", name: "Dex", mission: "Build and deploy the product." },
  { id: "op-3", name: "June", mission: "Write marketing copy and launch content." },
];

const MOCK_GROUP = {
  id: "group-1",
  user_id: "u1",
  workspace_id: null,
  name: "Product Launch",
  purpose: "Coordinating the September launch",
  status: "active" as const,
  last_message_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_MEMBERS = [
  { operator_id: "op-1", name: "Maya", mission: "Answer customer emails within the hour.", status: "active" },
  { operator_id: "op-2", name: "Dex", mission: "Build and deploy the product.", status: "active" },
  { operator_id: "op-3", name: "June", mission: "Write marketing copy and launch content.", status: "active" },
];

const MOCK_INITIAL_MESSAGES = [
  { id: "m1", group_id: "group-1", role: "user" as const, operator_id: null, body: "Where are we on the launch?", metadata: {}, created_at: new Date(Date.now() - 60000).toISOString() },
  { id: "m2", group_id: "group-1", role: "operator" as const, operator_id: "op-2", operator_name: "Dex", body: "Backend's deployed to staging. Waiting on the domain to go live before I push to prod.", metadata: {}, created_at: new Date(Date.now() - 45000).toISOString() },
];

export default function GroupsDesignPreviewPage() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"list" | "room">("list");

  useEffect(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/api/operator-groups") && method === "POST" && !url.includes("/messages")) {
        return new Response(JSON.stringify({ group: MOCK_GROUP, members: MOCK_MEMBERS }), { status: 201 });
      }
      if (url.includes("/messages") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        await new Promise((resolve) => setTimeout(resolve, 900)); // real turn takes a few seconds; mock a realistic delay
        return new Response(
          JSON.stringify({
            userMessage: { id: `u-${Date.now()}`, group_id: "group-1", role: "user", operator_id: null, body: body.body, metadata: {}, created_at: new Date().toISOString() },
            replies: [
              { id: `r-${Date.now()}`, group_id: "group-1", role: "operator", operator_id: "op-3", operator_name: "June", body: "I can have launch copy ready once we know the date — Dex, any ETA on the domain?", metadata: {}, created_at: new Date().toISOString() },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.match(/\/api\/operator-groups\/[^/]+$/) && method === "DELETE") {
        return new Response(JSON.stringify({ archived: true }), { status: 200 });
      }
      return realFetch(input, init);
    };
    setReady(true);
    return () => { window.fetch = realFetch; };
  }, []);

  if (!ready) return null;

  return (
    <DashboardWorkspace profile={{ full_name: "Michael", email: "michael@dobly.io" }} isAdmin={false} workspaces={[]} activeWorkspaceId={null}>
      <div className="mx-auto max-w-3xl space-y-4">
        {view === "list" ? (
          <>
            <section className="card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Groups</div>
                  <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Rooms where your coworkers talk to each other</h1>
                </div>
                <CreateGroupDrawer coworkers={MOCK_COWORKERS} />
              </div>
            </section>
            <button type="button" className="ref-button" onClick={() => setView("room")}>Open mock room (Product Launch) →</button>
          </>
        ) : (
          <GroupRoom group={MOCK_GROUP} members={MOCK_MEMBERS} initialMessages={MOCK_INITIAL_MESSAGES} />
        )}
      </div>
    </DashboardWorkspace>
  );
}
