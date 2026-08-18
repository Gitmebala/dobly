import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { TeachSkillFlow } from "@/components/dashboard/TeachSkillFlow";

export const metadata = { title: "Teach a skill" };

export default async function NewSkillPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const operators = await listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []);
  const coworkers = operators
    .filter((operator) => operator.status === "active")
    .map((operator) => ({ id: operator.id, name: operator.name }));

  return (
    <div className="mx-auto max-w-2xl">
      <TeachSkillFlow coworkers={coworkers} />
    </div>
  );
}
