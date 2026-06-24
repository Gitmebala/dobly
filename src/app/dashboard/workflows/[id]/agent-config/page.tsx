"use client";

import { useParams, usePathname } from "next/navigation";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";
import Link from "next/link";

type ConfigTab =
  | "basic"
  | "prompts"
  | "voice"
  | "conversation-flow"
  | "call-actions"
  | "calendar"
  | "escalation"
  | "integrations"
  | "deployment"
  | "monitoring";

const CONFIG_TABS: Array<{
  id: ConfigTab;
  label: string;
  description: string;
}> = [
  { id: "basic", label: "Role Foundation", description: "Desk type, role, business context" },
  { id: "prompts", label: "Prompts & Behavior", description: "Handling style and rules" },
  { id: "voice", label: "Voice & Audio", description: "Voice selection and parameters" },
  { id: "conversation-flow", label: "Conversation Flow", description: "Call conversation tree" },
  { id: "call-actions", label: "Call Actions", description: "Before/during/after actions" },
  { id: "calendar", label: "Calendar", description: "Booking and availability" },
  { id: "escalation", label: "Escalation", description: "Escalation rules" },
  { id: "integrations", label: "Integrations", description: "CRM and data sync" },
  { id: "deployment", label: "Deployment", description: "Numbers, channels, and webhooks" },
  { id: "monitoring", label: "Monitoring", description: "Analytics and call history" },
];

export default function AgentConfigPage() {
  const params = useParams();
  const pathname = usePathname();
  const workflowId = String(params?.id ?? "");

  // Determine active tab from pathname
  const pathParts = (pathname ?? "").split("/");
  const activeTab = (pathParts[pathParts.length - 1] || "basic") as ConfigTab;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href={`/dashboard/workflows/${workflowId}`} className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          Back to setup
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-text">Desk Configuration</h1>
          <p className="mt-1 text-sm text-text-muted">
            Set up how this desk handles calls, routing, escalations, and deployment
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 grid gap-4 md:grid-cols-5">
        {CONFIG_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/workflows/${workflowId}/agent-config/${tab.id}`}
            className={`group relative rounded-2xl border-2 p-4 transition-all ${
              activeTab === tab.id
                ? "border-accent bg-accent/10"
                : "border-border bg-[rgba(255,255,255,0.02)] hover:border-accent/50 hover:bg-[rgba(255,255,255,0.04)]"
            }`}
          >
            <div className="flex flex-col gap-2">
              <h3 className={`font-semibold ${activeTab === tab.id ? "text-accent" : "text-text"}`}>
                {tab.label}
              </h3>
              <p className="text-xs text-text-muted">{tab.description}</p>
            </div>
            {activeTab === tab.id && (
              <div className="absolute inset-0 rounded-2xl border-2 border-accent opacity-50" />
            )}
          </Link>
        ))}
      </div>

      {/* Content Area */}
      <div className="card min-h-[600px]">
        <div className="text-center">
          <p className="text-text-muted">Configuration page loading...</p>
        </div>
      </div>
    </div>
  );
}
