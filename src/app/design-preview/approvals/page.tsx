// No-auth preview of the Approvals page's new bulk-approve bar. The real
// page (src/app/dashboard/approvals/page.tsx) is a server component that
// fetches its own data with no prop injection, so this mirrors its markup
// with mock data rather than reusing it directly. Dev-only, never linked
// from product navigation. See memory: dobly-canvas-table-rebuild.
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3 } from "lucide-react";
import BulkApprovalActions from "@/components/dashboard/BulkApprovalActions";
import "@/app/dashboard/reference-app.css";

const mockRuntimeApprovals = [
  { id: "r1", title: "Send WhatsApp reply to 12 customers", message: "Maya wants to send a batch reply", risk_level: "medium", run_id: "run1", action_label: null },
  { id: "r2", title: "Draft follow-up email to lead", message: "Alex wants to draft (not send) a follow-up", risk_level: "low", run_id: "run2", action_label: null },
  { id: "r3", title: "Log a completed call summary", message: "Maya wants to file notes from a finished call", risk_level: "low", run_id: "run3", action_label: null },
];

const mockOfficeTasks = [
  { id: "t1", title: "Publish this week's competitor report", summary: "Nia finished the draft and wants to publish it", departmentId: "research", runtimeKind: "office", riskLevel: "medium", toolName: "Notion", status: "waiting_approval" },
  { id: "t2", title: "Tag 4 new leads in CRM", summary: "Routine categorization, nothing customer-facing", departmentId: "sales", runtimeKind: "office", riskLevel: "low", toolName: "HubSpot", status: "waiting_approval" },
];

export default function ApprovalsPreviewPage() {
  const waitingCount = mockRuntimeApprovals.length + mockOfficeTasks.length;
  return (
    <div className="approvals-workspace" style={{ minHeight: "100vh" }}>
      <header className="approvals-workspace-header">
        <div>
          <div className="workspace-kicker">Approvals</div>
          <h1>Review queue</h1>
          <p>Decide what can continue before it reaches customers, money, publishing, or connected systems.</p>
        </div>
        <div className="approval-queue-count" aria-label={`${waitingCount} approvals waiting`}>
          <Clock3 aria-hidden="true" />
          <strong>{waitingCount}</strong>
          <span>waiting</span>
        </div>
      </header>

      <section className="approval-queue dobly-stagger" aria-label="Items waiting for approval">
        <BulkApprovalActions
          runtimeIds={mockRuntimeApprovals.filter((a) => a.risk_level === "low").map((a) => a.id)}
          officeTaskIds={mockOfficeTasks.filter((t) => t.riskLevel === "low").map((t) => t.id)}
        />
        {mockRuntimeApprovals.map((approval) => (
          <article key={approval.id} className="approval-queue-item approval-queue-item-runtime">
            <div className="approval-decision-row">
              <div className="approval-item-summary">
                <div className="approval-item-icon">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="approval-item-copy">
                  <div className="approval-item-title">{approval.title}</div>
                  <p>{approval.message}</p>
                  <div className="approval-item-badges">
                    <span className="badge-muted text-xs">runtime</span>
                    <span className="badge-muted text-xs">{approval.risk_level} risk</span>
                  </div>
                </div>
              </div>
              <div className="approval-item-actions">
                <button className="btn-primary" type="button">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
              </div>
            </div>
            <details className="approval-evidence">
              <summary><ChevronDown aria-hidden="true" /> Review evidence and release path</summary>
            </details>
          </article>
        ))}
        {mockOfficeTasks.map((task) => (
          <article key={task.id} className="approval-queue-item">
            <div className="approval-decision-row">
              <div className="approval-item-summary">
                <div className="approval-item-icon">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="approval-item-copy">
                  <div className="approval-item-title">{task.title}</div>
                  <p>{task.summary}</p>
                  <div className="approval-item-badges">
                    <span className="badge-muted text-xs">{task.departmentId}</span>
                    <span className="badge-muted text-xs">{task.riskLevel}</span>
                    <span className="badge-muted text-xs">via {task.toolName}</span>
                  </div>
                </div>
              </div>
              <div className="approval-item-actions">
                <button className="btn-primary" type="button">Approve</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
