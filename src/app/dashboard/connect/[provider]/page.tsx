import { notFound, redirect } from "next/navigation";
import ProviderConnectClient from "@/components/dashboard/ProviderConnectClient";
import { getConnectionProvider, isConnectionProviderLaunchReady } from "@/lib/connection-catalog";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlanId } from "@/types";

export default async function ConnectProviderPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider: providerId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();

  const provider = getConnectionProvider(providerId);
  if (!provider || !isConnectionProviderLaunchReady(providerId)) notFound();

  return <ProviderConnectClient provider={provider} planId={(profile?.plan ?? "free") as PlanId} />;
}
