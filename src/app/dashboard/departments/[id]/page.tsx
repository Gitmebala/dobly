import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDepartmentBundle, type LaunchDepartmentId } from "@/lib/department-bundles";
import { resolveDepartmentCapabilityPlan } from "@/lib/department-capability-map";
import { OFFICE_DEPARTMENTS } from "@/lib/office/departments";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Connection } from "@/types";
import DepartmentLaunchButton from "@/components/dashboard/DepartmentLaunchButton";

export const metadata = { title: "Department" };

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = OFFICE_DEPARTMENTS.find((department) => department.id === id);
  if (!room) notFound();

  const bundle = getDepartmentBundle(id as LaunchDepartmentId);

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: connectionRows }, { data: workerRows }, { data: taskRows }] = await Promise.all([
    supabase.from("connections").select("*").eq("user_id", user.id).eq("status", "active"),
    supabase.from("office_workers").select("*").eq("user_id", user.id).eq("department_id", room.id),
    supabase
      .from("office_tasks")
      .select("id,title,summary,status,risk_level,created_at")
      .eq("user_id", user.id)
      .eq("department_id", room.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const connections = (connectionRows ?? []) as Connection[];
  const capabilityPlan = bundle ? resolveDepartmentCapabilityPlan({ departmentId: bundle.id, connections }) : null;
  const workers = workerRows ?? [];
  const tasks = taskRows ?? [];

  return (
    <div className="dept-detail-page">
      <header className="dept-detail-header">
        <Link href="/dashboard/departments" className="dept-detail-back"><ArrowLeft size={16} /> Departments</Link>
        <div className="dept-detail-heading">
          <div>
            <h1>{room.name}</h1>
            <p>{bundle?.outcome ?? "Always-on office room"}</p>
          </div>
          {bundle ? <DepartmentLaunchButton departmentId={bundle.id} hasWorkers={workers.length > 0} /> : null}
        </div>
        <p className="dept-detail-description">{bundle?.description ?? room.purpose}</p>
      </header>

      {bundle ? (
        <section className="dept-detail-section">
          <h2>Autonomy boundary</h2>
          <p>{bundle.autonomyBoundary}</p>
          <div className="dept-detail-tags">
            <span data-trust={bundle.trustLevel}>{bundle.trustLevel.replaceAll("_", " ")}</span>
            {bundle.orchestrationModes.map((mode) => (
              <span key={mode}>{mode}</span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="dept-detail-section">
        <h2>Roster ({workers.length})</h2>
        {workers.length === 0 ? (
          <p className="dept-detail-empty">
            {bundle
              ? `No workers hired yet. Launch this department to hire ${bundle.workerTemplateKeys.length} worker${bundle.workerTemplateKeys.length === 1 ? "" : "s"}.`
              : "This room runs automatically and does not hire dedicated workers."}
          </p>
        ) : (
          <ul className="dept-detail-roster">
            {workers.map((worker) => (
              <li key={String(worker.id)}>
                <strong>{String(worker.name ?? worker.worker_key)}</strong>
                <span>{String(worker.mission ?? "")}</span>
                <em>{String(worker.autonomy_mode ?? "guarded")}</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dept-detail-section">
        <h2>Recent activity</h2>
        {tasks.length === 0 ? (
          <p className="dept-detail-empty">No tasks yet for this room.</p>
        ) : (
          <ul className="dept-detail-tasks">
            {tasks.map((task) => (
              <li key={String(task.id)} data-status={String(task.status)}>
                <strong>{String(task.title)}</strong>
                <span>{String(task.summary ?? "")}</span>
                <em>{String(task.status)} &middot; {String(task.risk_level)}</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      {capabilityPlan ? (
        <section className="dept-detail-section">
          <h2>Readiness</h2>
          <ul className="dept-detail-capabilities">
            {capabilityPlan.capabilities.map((capability) => (
              <li key={capability.id} data-status={capability.readiness}>
                <strong>{capability.label}</strong>
                <span>{capability.userMessage}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="dept-detail-section">
          <h2>Tracked metrics</h2>
          <div className="dept-detail-tags">
            {room.defaultMetrics.map((metric: string) => (
              <span key={metric}>{metric.replaceAll("_", " ")}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
