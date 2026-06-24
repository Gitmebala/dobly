import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock3 } from "lucide-react";
import OfficeTaskDecisionButtons from "@/components/dashboard/OfficeTaskDecisionButtons";
import ApprovalDecisionButtons from "@/components/dashboard/ApprovalDecisionButtons";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { listRuntimeApprovals } from "@/lib/runtime/approvals";

export default async function ApprovalsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  const userId = user.id;

  const office = (await buildHomebaseDashboardData({ userId }).catch(() => null)) ?? ({
    departments: [],
    tasks: [],
  } as unknown as Awaited<ReturnType<typeof buildHomebaseDashboardData>>);
  const decisions = office.tasks.filter((task) => task.status === "waiting_approval");
  const runtimeApprovals = await listRuntimeApprovals({ userId, status: "pending" }).catch(() => []);
  const waitingCount = decisions.length + runtimeApprovals.length;

  return (
    <div className="approvals-workspace">
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

      {waitingCount === 0 ? (
        <section className="approval-empty-state">
          <div className="approval-empty-icon">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2>Nothing needs your decision</h2>
          <p>The office is continuing within the rules you have already approved.</p>
        </section>
      ) : (
        <section className="approval-queue" aria-label="Items waiting for approval">
          {runtimeApprovals.map((approval) => {
            const metadata = (approval.metadata ?? {}) as Record<string, any>;
            const resume = (metadata.resume ?? {}) as Record<string, any>;
            const path = (metadata.path ?? {}) as Record<string, any>;
            const releaseGate = metadata.releaseGate as Record<string, any> | undefined;
            const reviewPacket = releaseGate?.packet as Record<string, any> | undefined;
            const contextUsed = Array.isArray(reviewPacket?.contextUsed) ? reviewPacket.contextUsed.slice(0, 4) : [];
            const standards = Array.isArray(reviewPacket?.standardChecked) ? reviewPacket.standardChecked.slice(0, 4) : [];
            const remainingRisk = Array.isArray(reviewPacket?.remainingRisk) ? reviewPacket.remainingRisk.slice(0, 3) : [];
            const examplesCompared = Array.isArray(reviewPacket?.examplesCompared) ? reviewPacket.examplesCompared.slice(0, 3) : [];
            return (
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
                        {approval.run_id ? <span className="badge-muted text-xs">run attached</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="approval-item-actions"><ApprovalDecisionButtons approvalId={approval.id} /></div>
                </div>

                <details className="approval-evidence">
                  <summary><ChevronDown aria-hidden="true" /> Review evidence and release path</summary>
                  <div className="approval-evidence-grid">
                    <EvidenceBlock title="Decision path">
                      <p><strong>After approval</strong>{approval.action_label ?? resume.type ?? "Resume the queued coworker run."}</p>
                      <p><strong>Tool path</strong>{String(path.label ?? path.connection?.label ?? metadata.provider ?? "Dobly runtime")}</p>
                      {releaseGate?.decision ? <p><strong>Release decision</strong>{String(releaseGate.decision).replace(/_/g, " ")}</p> : null}
                      {reviewPacket?.confidence ? <p><strong>Confidence</strong>{String(reviewPacket.confidence)}</p> : null}
                    </EvidenceBlock>
                    {contextUsed.length > 0 ? <EvidenceList title="Context used" items={contextUsed.map(String)} /> : null}
                    {standards.length > 0 ? <EvidenceList title="Standards checked" items={standards.map(String)} /> : null}
                    {examplesCompared.length > 0 ? (
                      <EvidenceList title="Reference examples" items={examplesCompared.map((item) => `${String(item.qualityLevel ?? "reference")} · ${String(item.title ?? "Stored example")}`)} />
                    ) : null}
                    {remainingRisk.length > 0 ? <EvidenceList title="Remaining risk" items={remainingRisk.map(String)} /> : null}
                  </div>
                </details>
              </article>
            );
          })}

          {decisions.map((task) => {
            const room = office.departments.find((department) => department.id === task.departmentId);
            return (
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
                        <span className="badge-muted text-xs">{room?.name ?? task.departmentId}</span>
                        <span className="badge-muted text-xs">{task.runtimeKind}</span>
                        <span className="badge-muted text-xs">{task.riskLevel}</span>
                        {task.toolName ? <span className="badge-muted text-xs">via {task.toolName}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="approval-item-actions"><OfficeTaskDecisionButtons taskId={task.id} /></div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function EvidenceBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="approval-evidence-block">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <EvidenceBlock title={title}>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </EvidenceBlock>
  );
}
