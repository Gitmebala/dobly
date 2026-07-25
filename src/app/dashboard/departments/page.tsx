import Link from "next/link";
import { redirect } from "next/navigation";
import { DEPARTMENT_BUNDLES } from "@/lib/department-bundles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Connection } from "@/types";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: workerRows }, { data: connectionRows }] = await Promise.all([
    supabase.from("office_workers").select("department_id").eq("user_id", user.id),
    supabase.from("connections").select("*").eq("user_id", user.id).eq("status", "active"),
  ]);

  const workerCounts: Record<string, number> = {};
  for (const row of workerRows ?? []) {
    const key = String((row as { department_id?: string }).department_id ?? "");
    workerCounts[key] = (workerCounts[key] ?? 0) + 1;
  }

  const connections = (connectionRows ?? []) as Connection[];

  return (
    <div className="dept-page">
      <header className="dept-page-header">
        <div>
          <span className="dept-page-kicker">Homebase</span>
          <h1>Departments</h1>
          <p>Each department is a real crew of office workers Dobly can hire and run under a guarded autonomy boundary.</p>
        </div>
      </header>

      <div className="dept-grid">
        {DEPARTMENT_BUNDLES.map((bundle) => {
          const hired = workerCounts[bundle.id] ?? 0;
          return (
            <Link key={bundle.id} href={`/dashboard/departments/${bundle.id}`} className="dept-card">
              <div className="dept-card-top">
                <h2>{bundle.name}</h2>
                <span className="dept-card-trust" data-trust={bundle.trustLevel}>{bundle.trustLevel.replaceAll("_", " ")}</span>
              </div>
              <p className="dept-card-outcome">{bundle.outcome}</p>
              <div className="dept-card-footer">
                <span>{hired > 0 ? `${hired} worker${hired === 1 ? "" : "s"} hired` : "Not launched"}</span>
                <span>{bundle.workerTemplateKeys.length} role{bundle.workerTemplateKeys.length === 1 ? "" : "s"} available</span>
              </div>
            </Link>
          );
        })}
      </div>
      {connections.length === 0 ? (
        <p className="dept-page-note">No connections are active yet — departments can still draft and prepare work, but live external actions need at least one connection.</p>
      ) : null}
    </div>
  );
}
