import { redirect } from "next/navigation";
import DepartmentBuilderClient from "@/components/dashboard/DepartmentBuilderClient";
import { DEPARTMENT_BUNDLES } from "@/lib/department-bundles";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DepartmentsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowLocalDemo = process.env.NODE_ENV !== "production";
  if (!user && !allowLocalDemo) redirect("/auth/login");
  const userId = user?.id ?? "local-demo";

  const office = await buildHomebaseDashboardData({ userId }).catch(() => ({
    departments: [],
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="card">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--dobly-text-dim)]">
          Business operating system
        </div>
        <h1 className="mt-2 max-w-4xl font-display text-4xl tracking-[-0.06em] text-[var(--dobly-text)]">
          Every department becomes a room you can open, inspect, and run.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--dobly-text-secondary)]">
          Think Odoo's business modules, ClickUp's workspace hierarchy, and a live AI team underneath. Open a
          department to see its coworkers, chats, records, work queue, approvals, tools, activity, and handoffs. Then
          zoom out to the General Manager and Board when you need the whole company view.
        </p>
      </section>

      <DepartmentBuilderClient departments={DEPARTMENT_BUNDLES} officeDepartments={office.departments} />
    </div>
  );
}
