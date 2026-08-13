// No-auth preview of the real dashboard shell + home Canvas/Table page,
// wired with mock data. Exists purely so the Canvas+Table rebuild can be
// eyeballed without a live Supabase session — never linked from product
// navigation, dev-only. See memory: dobly-canvas-table-rebuild.
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import DoblyDashboardClient from "@/app/dashboard/DoblyDashboardClient";
import "@/app/dashboard/reference-app.css";

const mockTeam = [
  { id: "1", name: "Maya", mission: "Customer support across WhatsApp and email", status: "active", kind: "support", lastRunAt: new Date(Date.now() - 6 * 60000).toISOString(), loopCount: 3 },
  { id: "2", name: "Alex", mission: "Sales follow-ups and lead qualification", status: "active", kind: "sales", lastRunAt: new Date(Date.now() - 40 * 60000).toISOString(), loopCount: 1 },
  { id: "3", name: "Nia", mission: "Weekly competitor and market research", status: "paused", kind: "research", lastRunAt: new Date(Date.now() - 2 * 86400000).toISOString(), loopCount: 0 },
];

const mockLoops = [
  { id: "l1", name: "Morning WhatsApp triage", operatorId: "1", operatorName: "Maya", status: "active", updatedAt: new Date(Date.now() - 3 * 60000).toISOString() },
  { id: "l2", name: "Friday lead recap", operatorId: "2", operatorName: "Alex", status: "active", updatedAt: new Date(Date.now() - 3 * 3600000).toISOString() },
];

const mockApprovals = [
  { id: "a1", title: "Send WhatsApp reply to 12 customers", message: "Maya wants to send a batch reply", requested_at: new Date(Date.now() - 12 * 60000).toISOString() },
];

const mockConnections = [
  { id: "c1", provider: "WhatsApp", status: "connected", updated_at: new Date().toISOString() },
  { id: "c2", provider: "Gmail", status: "connected", updated_at: new Date().toISOString() },
];

const mockSnapshot = {
  corePromise: "Hire your first coworker and hand over the work you shouldn't be doing.",
  focusReason: "",
  focusWedge: "",
  metrics: {
    activeSystems: 4,
    ranToday: 9,
    failedToday: 0,
    waitingApprovals: 1,
    reconnectNeeded: 0,
    changedRecently: 2,
    timeSavedHours: 6,
  },
  recommendations: [{ title: "Teach Maya your delivery pricing — she's asked twice this week." }],
  businessMemory: [],
  whatNeedsAttention: [
    { text: "Approve Maya's batch WhatsApp reply", href: "/dashboard/approvals" },
    { text: "Reconnect Gmail for Alex — token expiring soon", href: "/dashboard/connections" },
    { text: "Review Nia's competitor report draft", href: "/dashboard/health" },
  ],
};

export default function DesignPreviewPage() {
  return (
    <DashboardWorkspace
      profile={{ full_name: "Michael", email: "michael@dobly.io" }}
      isAdmin={false}
      workspaces={[]}
      activeWorkspaceId={null}
    >
      <DoblyDashboardClient
        recentLoops={mockLoops}
        latestRuns={[]}
        latestApprovals={mockApprovals}
        latestConnections={mockConnections}
        snapshot={mockSnapshot}
        workflowTitles={{}}
        runLabels={{}}
        onboarding={{ hasBusinessContext: true, hasConnection: true, hasWorkflow: true }}
        firstName="Michael"
        team={mockTeam}
        runsThisWeek={14}
        completedRunsThisWeek={12}
        justOnboarded={false}
      />
    </DashboardWorkspace>
  );
}
