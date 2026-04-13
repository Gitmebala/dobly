import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ApprovalActions from "@/components/dashboard/ApprovalActions";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: approval } = await supabase.from("approvals").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!approval) notFound();
  const resume = (approval.metadata?.resume ?? {}) as { stepId?: string; stepIndex?: number };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/approvals" className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to approvals
      </Link>

      <section className="card">
        <div className="mb-4 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-yellow-300" />
          <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Approval detail</div>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-text">{approval.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          {approval.message}
        </p>
        <div className="mt-6 rounded-[1rem] border border-[rgba(255,211,106,0.22)] bg-[rgba(255,211,106,0.06)] px-5 py-4 text-sm text-text">
          Channel: {approval.channel}. Risk: {approval.risk_level}. Requested {new Date(approval.requested_at).toLocaleString()}.
        </div>
        {approval.action_label ? (
          <div className="mt-4 rounded-[1rem] border border-border bg-surface px-5 py-4 text-sm text-text-muted">
            Action label: <span className="text-text">{approval.action_label}</span>
          </div>
        ) : null}
        {resume.stepId ? (
          <div className="mt-4 rounded-[1rem] border border-border bg-surface px-5 py-4 text-sm text-text-muted">
            If approved, Dobly resumes at guarded step <span className="text-text">{resume.stepIndex != null ? resume.stepIndex + 1 : "?"}</span> ({resume.stepId}).
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {approval.status === "pending" ? <ApprovalActions approvalId={approval.id} /> : <div className="badge-green capitalize">{approval.status}</div>}
          <Link href={`/dashboard/workflows/${approval.workflow_id}`} className="btn-ghost">Open workflow</Link>
        </div>
      </section>
    </div>
  );
}
