import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimits } from "@/lib/rate-limit";

type SearchRecord = {
  id: string;
  label: string;
  description: string;
  type: string;
  href: string;
};

function matches(record: SearchRecord, query: string) {
  if (!query) return true;
  return `${record.label} ${record.description} ${record.type}`.toLowerCase().includes(query);
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.api(user.id).allowed) return NextResponse.json({ error: "Too many searches." }, { status: 429 });

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 120);
  // dobly_operators (and most of these tables) have RLS with no policy
  // letting the regular request-scoped client read rows directly - every
  // other operator/approval/artifact read in this codebase goes through the
  // admin client for that reason. This route already authorizes every query
  // with an explicit .eq("user_id", user.id), so admin here is safe.
  const admin = createAdminSupabaseClient();
  const settled = await Promise.allSettled([
    admin.from("workspace_tasks").select("id,title,description,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    admin.from("workspace_projects").select("id,name,description,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    admin.from("workspace_documents").select("id,title,type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    admin.from("dobly_operators").select("id,name,mission,status,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50),
    admin.from("runtime_approvals").select("id,title,message,status,requested_at").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(50),
    admin.from("software_execution_artifacts").select("id,title,kind,run_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    admin.from("business_memory_items").select("id,title,body,scope,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50),
    admin.from("connections").select("id,label,provider,status,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50),
    admin.from("briefings").select("id,title,summary,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const rows = settled.map((result) => result.status === "fulfilled" ? result.value.data ?? [] : []);
  const records: SearchRecord[] = [
    ...rows[0].map((item: any) => ({ id: `task-${item.id}`, label: item.title, description: item.description || item.status, type: "Task", href: "/dashboard/tasks" })),
    ...rows[1].map((item: any) => ({ id: `project-${item.id}`, label: item.name, description: item.description || item.status, type: "Project", href: "/dashboard/projects" })),
    ...rows[2].map((item: any) => ({ id: `document-${item.id}`, label: item.title, description: item.type || "Document", type: "Document", href: "/dashboard/documents" })),
    ...rows[3].map((item: any) => ({ id: `coworker-${item.id}`, label: item.name, description: item.mission || item.status, type: "Coworker", href: `/dashboard/coworkers?operatorId=${encodeURIComponent(item.id)}` })),
    ...rows[4].map((item: any) => ({ id: `approval-${item.id}`, label: item.title, description: item.message || item.status, type: "Approval", href: "/dashboard/approvals" })),
    ...rows[5].map((item: any) => ({ id: `artifact-${item.id}`, label: item.title, description: item.kind || "Output", type: "Output", href: "/dashboard/documents" })),
    ...rows[6].map((item: any) => ({ id: `memory-${item.id}`, label: item.title, description: item.body || item.scope, type: "Memory", href: "/dashboard/memory" })),
    ...rows[7].map((item: any) => ({ id: `connection-${item.id}`, label: item.label || item.provider, description: `${item.provider || "Service"} · ${item.status || "configured"}`, type: "Connection", href: `/dashboard/connections/${item.id}` })),
    ...rows[8].map((item: any) => ({ id: `briefing-${item.id}`, label: item.title, description: item.summary || item.status, type: "Briefing", href: "/dashboard/briefings" })),
  ];

  return NextResponse.json({ records: records.filter((record) => matches(record, query)).slice(0, 30) });
}
