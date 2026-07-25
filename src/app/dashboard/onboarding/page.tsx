import { redirect } from "next/navigation";
import { isConnectionOperational } from "@/lib/connection-readiness";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
import type { PlanId } from "@/types";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: connections }, { data: businessProfile }, operators] = await Promise.all([
    supabase.from("profiles").select("full_name, plan").eq("id", user.id).single(),
    supabase.from("connections").select("*").eq("user_id", user.id),
    supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
    listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []),
  ]);

  const readyConnections = (connections ?? []).filter(isConnectionOperational);
  const hasBusinessContext = Boolean(businessProfile?.business_name && businessProfile?.description);
  const hasConnection = readyConnections.length > 0;
  const latestOperator = operators[0] ?? null;
  const hasWorkflow = Boolean(latestOperator);
  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || user.user_metadata?.full_name?.trim().split(/\s+/)[0] || "there";

  return (
    <OnboardingWizard
      firstName={firstName}
      hasBusinessContext={hasBusinessContext}
      hasConnection={hasConnection}
      hasWorkflow={hasWorkflow}
      businessProfile={businessProfile ?? null}
      planId={(profile?.plan ?? "free") as PlanId}
      operator={
        latestOperator ? { id: latestOperator.id, name: latestOperator.name, approvalMode: latestOperator.approval_mode } : null
      }
    />
  );
}
