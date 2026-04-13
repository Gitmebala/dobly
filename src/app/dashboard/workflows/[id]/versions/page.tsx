import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import VersionHistoryClient from "@/components/dashboard/VersionHistoryClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { WorkflowVersion } from "@/types";

export default async function WorkflowVersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: workflow }, { data: versions }] = await Promise.all([
    supabase.from("workflows").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("workflow_versions").select("*").eq("workflow_id", id).eq("user_id", user.id).order("version_number", { ascending: false }),
  ]);

  if (!workflow) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/dashboard/workflows/${id}`} className="btn-ghost inline-flex">
        <ArrowLeft className="h-4 w-4" />
        Back to workflow
      </Link>

      <section className="card">
        <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Version history</div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">{workflow.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
          Every deployment creates a version. Restore a previous version in one tap if a change breaks something.
        </p>
      </section>

      {(versions ?? []).length === 0 ? (
        <section className="card">
          <p className="text-sm leading-7 text-text-muted">
            No saved versions yet. Once this workflow is updated or deployed through Dobly, version history will appear here.
          </p>
        </section>
      ) : null}

      <VersionHistoryClient workflowId={id} versions={(versions ?? []) as WorkflowVersion[]} />
    </div>
  );
}
