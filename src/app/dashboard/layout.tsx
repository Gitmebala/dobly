import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import CommandPalette from "@/components/dashboard/CommandPalette";
import { isAdminEmail } from "@/lib/admin";
import "./reference-app.css";
import { resolveActiveWorkspace } from "@/lib/active-workspace";

export const metadata: Metadata = {
  title: { template: "%s · Dobly", default: "Workspace · Dobly" },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: storedProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const profile = {
    ...(storedProfile ?? {}),
    full_name: storedProfile?.full_name || user.user_metadata?.full_name || "",
    email: storedProfile?.email || user.email || "",
  };
  const { workspaces, activeWorkspace } = await resolveActiveWorkspace(user.id);

  return (
    <DashboardWorkspace profile={profile} isAdmin={isAdminEmail(user.email)} workspaces={workspaces} activeWorkspaceId={activeWorkspace?.id ?? null}>
      {children}
      <CommandPalette />
    </DashboardWorkspace>
  );
}
