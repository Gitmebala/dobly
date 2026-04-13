import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCircle2, MessageCircleWarning } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ApprovalActions from "@/components/dashboard/ApprovalActions";

export default async function ApprovalsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: approvals } = await supabase
    .from("approvals")
    .select("*")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Approvals</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">High-risk actions wait here until you say yes.</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              Dobly routes approvals to the right channel so sensitive actions can pause cleanly instead of failing silently.
            </p>
          </div>
          <div className="badge-green">
            <BellRing className="h-3.5 w-3.5" />
            Approval center
          </div>
        </div>
      </section>

      {(approvals ?? []).length === 0 ? (
        <section className="card text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-text">No pending approvals</h2>
          <p className="mx-auto mt-3 max-w-md text-text-muted">
            Your active automations are currently running without manual intervention.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {(approvals ?? []).map((item) => (
            <div key={item.id} className="card-hover">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,211,106,0.12)] text-yellow-300">
                    <MessageCircleWarning className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-xl font-semibold text-text">{item.title}</div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{item.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div className="badge-muted">{item.channel} approval route</div>
                      <div className="badge-muted">risk: {item.risk_level}</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {item.status === "pending" ? <ApprovalActions approvalId={item.id} /> : <div className="badge-green capitalize">{item.status}</div>}
                  <Link href={`/dashboard/approvals/${item.id}`} className="btn-ghost">
                    Review
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
