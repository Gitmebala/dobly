import { redirect } from "next/navigation";
import CinematicBackdrop from "@/components/CinematicBackdrop";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/Header";
import MobileDock from "@/components/dashboard/MobileDock";

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

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="dashboard-shell flex gap-4 px-4 pb-4 pt-4 sm:px-5 lg:px-4">
      <CinematicBackdrop intensity="strong" className="fixed inset-0 -z-10 opacity-70" />
      <DashboardSidebar profile={profile} />
      <div className="dashboard-main flex min-w-0 flex-1 flex-col">
        <DashboardHeader profile={profile} />
        <main className="flex-1 px-0 pb-28 pt-6 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileDock />
    </div>
  );
}
