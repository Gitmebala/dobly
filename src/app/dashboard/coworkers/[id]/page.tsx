import { redirect } from "next/navigation";

// A coworker used to have two separate pages: this "desk" page (stats,
// directives, task queue) and the chat console at
// /dashboard/coworkers?operatorId=X. Same entity, two disconnected URLs -
// confusing, and the desk page's content (runs, approvals, outputs,
// handoffs, events, guardrails, loops) is now all inside the chat
// console's "Coworker details" inspector drawer. One coworker, one URL.
export default async function CoworkerRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/coworkers?operatorId=${encodeURIComponent(id)}`);
}
