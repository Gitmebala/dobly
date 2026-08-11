// No-auth preview of the real OperatorChatConsole with mock data — same
// purpose as ../page.tsx, for the Assistants/coworker chat surface. Dev
// only, never linked from product navigation.
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import OperatorChatConsole from "@/components/dashboard/OperatorChatConsole";
import "@/app/dashboard/reference-app.css";

const now = Date.now();
const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60000).toISOString();

export default function CoworkerDesignPreviewPage() {
  return (
    <DashboardWorkspace
      profile={{ full_name: "Michael", email: "michael@dobly.io" }}
      isAdmin={false}
      workspaces={[]}
      activeWorkspaceId={null}
    >
      <OperatorChatConsole
        operator={{
          id: "op-1",
          name: "Maya",
          mission: "Customer support across WhatsApp and email",
          outcome: "Every customer question answered within the hour.",
          status: "active",
          kind: "Customer Support",
          approval_mode: "approve_risky",
          capability_tags: ["support", "whatsapp", "email"],
          guardrails: { rules: ["Never promise a refund without approval", "Escalate anything about a legal complaint"] },
          last_run_at: iso(6),
          loops: [
            { id: "loop-1", name: "Morning WhatsApp triage", cadence: "daily", status: "active", trigger: "09:00 daily" },
          ],
        }}
        conversation={{ id: "conv-1", title: "Maya Chat", summary: "", last_message_at: iso(2) }}
        messages={[
          { id: "m1", role: "user", body: "What are the most common customer questions today?", intent: "instruction", created_at: iso(20) },
          { id: "m2", role: "operator", body: "Here are the top questions I've received today:\n\n- How do I track my order?\n- What is your return policy?\n- Do you offer same-day delivery?", intent: "message", created_at: iso(19) },
        ] as any}
        events={[]}
        feedback={[]}
        recentRuns={[
          { id: "r1", status: "completed", task: "Reply to return-policy question", summary: "Answered using the return policy doc.", created_at: iso(30) },
        ]}
        artifacts={[]}
        approvals={[]}
        voiceRecords={[]}
        memoryProposals={[]}
        channels={[
          { id: "c1", channel_id: "whatsapp_business", display_name: "WhatsApp", status: "live", updated_at: iso(60) },
          { id: "c2", channel_id: "business_email", display_name: "Gmail", status: "live", updated_at: iso(120) },
          { id: "c3", channel_id: "website_chat", display_name: "Live chat", status: "needs_attention", updated_at: iso(500) },
        ]}
        knowledge={[
          { id: "k1", kind: "policy", scope: "support", title: "Return & Refund Policy", updated_at: iso(7200) },
          { id: "k2", kind: "faq", scope: "global", title: "Product Catalog FAQ", updated_at: iso(1440) },
        ]}
      />
    </DashboardWorkspace>
  );
}
