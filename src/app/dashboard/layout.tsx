import { redirect } from "next/navigation";
import CinematicBackdrop from "@/components/CinematicBackdrop";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/Header";

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
    <div className="dashboard-shell flex">
      <CinematicBackdrop className="fixed inset-0 -z-10 opacity-80" />
      <DashboardSidebar profile={profile} />
      <div className="dashboard-main flex min-w-0 flex-1 flex-col lg:ml-72">
        <DashboardHeader profile={profile} />
        <main className="flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
