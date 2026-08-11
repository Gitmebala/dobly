"use client";

// No-auth preview of the real OperatorHandleBar (coworker hire flow).
// Stubs fetch for the propose/test endpoints with a realistic payload so
// the REAL component code runs end to end, including the newly-added
// per-scenario test results rendering, without needing a live session.
import { useEffect, useState } from "react";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import OperatorHandleBar from "@/components/dashboard/OperatorHandleBar";
import "@/app/dashboard/reference-app.css";

const MOCK_PROPOSAL = {
  id: "prop-1",
  status: "draft",
  prompt: "Answer customer emails within the hour, keep the tone warm, and ask me before offering any refund.",
  proposal: {
    name: "Maya",
    mission: "Answer customer emails within the hour and keep the tone warm.",
    office: "Support",
    department: "Customer Support",
    coworkerRecipe: {
      label: "Support responder",
      family: "support",
      abilityStack: ["Read inbox", "Draft replies", "Search knowledge", "Escalate unusual cases", "Track response time"],
      executionModes: { free: [], connectedAccount: ["gmail"], paidRail: [] },
      outputs: ["email_reply"],
      memoryRules: [],
      qualityBar: [],
    },
    approvalMode: "approve_risky",
    capabilityTags: ["support", "email"],
    requiredConnections: [
      { id: "gmail", label: "Gmail", provider: "google", reason: "Read and send customer email replies", setupMode: "oauth", approvalRequired: false, costModes: ["free"] },
    ],
    loops: [{ name: "Inbox sweep", cadence: "hourly", trigger: "new email" }],
    approvalRules: ["Offering any refund", "Anything about a legal complaint", "Discounting more than 10%"],
    testScenarios: [
      { title: "Customer asks about a late delivery", risk: "low", expected: "Maya explains the delay and offers a tracking update." },
      { title: "Customer asks for a refund", risk: "high", expected: "Maya prepares the refund and asks for approval first." },
    ],
    riskCards: [],
  },
};

export default function HireDesignPreviewPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/operators/propose")) {
        return new Response(JSON.stringify({ proposal: MOCK_PROPOSAL }), { status: 200 });
      }
      if (url.includes("/simulate")) {
        const simulated = {
          ...MOCK_PROPOSAL,
          status: "tested",
          test_results: {
            simulatedAt: new Date().toISOString(),
            simulation: [
              {
                scenarioTitle: "Customer asks about a late delivery",
                risk: "low",
                incomingMessage: "Hey, I ordered on Monday and it still hasn't arrived — any idea what's going on?",
                coworkerReply: "Thanks for flagging this! I can see your order is still in transit — it looks like it's running about a day behind schedule. I'll keep an eye on it and let you know the moment there's an update. Sorry for the wait!",
                flaggedForApproval: false,
              },
              {
                scenarioTitle: "Customer asks for a refund",
                risk: "high",
                incomingMessage: "This isn't what I ordered at all, I want my money back.",
                coworkerReply: "I'm really sorry that happened — that's not the experience we want for you. I've pulled together the details of your order and I'm preparing a refund request now, but I need the owner to sign off before I can process it. I'll follow up as soon as it's approved.",
                flaggedForApproval: true,
              },
            ],
          },
        };
        return new Response(JSON.stringify({ proposal: simulated }), { status: 200 });
      }
      if (url.includes("/test")) {
        const tested = {
          ...MOCK_PROPOSAL,
          status: "tested",
          test_results: {
            status: "needs_setup",
            connectionReadiness: [{ id: "gmail", label: "Gmail", provider: "google", ready: false, detail: "Gmail isn't connected yet — connect it to let Maya send real replies." }],
            scenarios: [
              { title: "Customer asks about a late delivery", risk: "low", expected: "Maya explains the delay and offers a tracking update.", status: "blocked_on_setup", observed: "This scenario can't run live until the connections below are set up. Dobly will not fake a result." },
              { title: "Customer asks for a refund", risk: "high", expected: "Maya prepares the refund and asks for approval first.", status: "blocked_on_setup", observed: "This scenario can't run live until the connections below are set up. Dobly will not fake a result." },
            ],
            summary: "Ready to hire, but not ready to act live yet: Gmail still needs to be connected.",
          },
        };
        return new Response(JSON.stringify({ proposal: tested }), { status: 200 });
      }
      return realFetch(input, init);
    };
    setReady(true);
    return () => { window.fetch = realFetch; };
  }, []);

  if (!ready) return null;

  return (
    <DashboardWorkspace profile={{ full_name: "Michael", email: "michael@dobly.io" }} isAdmin={false} workspaces={[]} activeWorkspaceId={null}>
      <div className="ref-page">
        <OperatorHandleBar initialPrompt="Answer customer emails within the hour, keep the tone warm, and ask me before offering any refund." />
      </div>
    </DashboardWorkspace>
  );
}
