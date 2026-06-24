import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot, Sparkles, UserRound } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: profile }, { data: operators }, { data: legacyCoworkers }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("dobly_operators").select("id,name,mission,status,updated_at").eq("user_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }),
    supabase.from("coworkers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const names = new Set((operators ?? []).map((item: any) => String(item.name).trim().toLowerCase()));
  const coworkers = [
    ...(operators ?? []).map((item: any) => ({ ...item, canonical: true })),
    ...(legacyCoworkers ?? []).filter((item: any) => !names.has(String(item.name).trim().toLowerCase())).map((item: any) => ({ ...item, canonical: false })),
  ];
  return <div className="ref-page"><header className="ref-header"><div><div className="ref-greeting"><Sparkles size={16} /> Humans and AI coworkers</div><h1>Team</h1><p className="ref-subtitle">The people accountable for decisions and the coworkers carrying work forward.</p></div><Link className="ref-button primary" href="/dashboard/coworkers">Add coworker</Link></header><div className="ref-stack"><section className="ref-card"><div className="ref-section-title"><strong>Workspace owner</strong></div><div className="ref-person"><span className="ref-avatar"><UserRound /></span><div><strong>{profile?.full_name || "Workspace owner"}</strong><small>{profile?.email || user.email}</small></div><span className="ref-pill green">Owner</span></div></section><section className="ref-card"><div className="ref-section-title"><strong>AI coworkers</strong><span className="ref-pill">{coworkers.length}</span></div>{coworkers.map((coworker: any) => <Link className="ref-person" href={coworker.canonical ? `/dashboard/coworkers?operatorId=${coworker.id}` : "/dashboard/coworkers"} key={`${coworker.canonical ? "operator" : "legacy"}:${coworker.id}`}><span className="ref-avatar"><Bot /></span><div><strong>{coworker.name}</strong><small>{coworker.mission || coworker.description || "Ready for a mission"}</small></div><span className="ref-pill">{coworker.status || "draft"}</span><ArrowRight size={15} /></Link>)}{!coworkers.length ? <div className="ref-empty-state"><Bot /><h2>No AI coworkers yet</h2><p>Create a role with a mission, tools, guardrails, and measurable outcomes.</p></div> : null}</section></div></div>;
}
