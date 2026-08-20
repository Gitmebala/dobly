import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { listOperatorGroups } from "@/lib/operator-groups";
import { BrainView } from "@/components/dashboard/BrainView";

export const metadata = { title: "Brain" };

// Founder, directly: "brain view... makes you see everything like
// obsidian" - a live map of the real business, not a mock. v1 scope is
// deliberately bounded rather than everything at once: coworkers, the
// loops each one owns, and the groups connecting coworkers to each
// other. Real data, no placeholder nodes - an account with nothing
// hired yet gets a real empty state, not fabricated content standing
// in for work that hasn't happened (same principle as the Canvas
// work-table's own empty state).
export default async function BrainPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [operators, groups] = await Promise.all([
    listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []),
    listOperatorGroups({ userId: user.id }).catch(() => [] as Awaited<ReturnType<typeof listOperatorGroups>>),
  ]);

  const nodes = [
    ...operators.map((operator) => ({
      id: `operator:${operator.id}`,
      kind: "operator" as const,
      label: operator.name,
      sublabel: operator.mission,
      status: operator.status,
      href: `/dashboard/coworkers?operatorId=${operator.id}`,
    })),
    ...operators.flatMap((operator) =>
      (operator.loops ?? [])
        .filter((loop) => loop.status !== "archived")
        .map((loop) => ({
          id: `loop:${loop.id}`,
          kind: "loop" as const,
          label: loop.name,
          sublabel: operator.name,
          status: loop.status,
          href: `/dashboard/coworkers?operatorId=${operator.id}`,
        })),
    ),
    ...groups.map(({ group }) => ({
      id: `group:${group.id}`,
      kind: "group" as const,
      label: group.name,
      sublabel: group.purpose,
      status: group.status,
      href: `/dashboard/groups/${group.id}`,
    })),
  ];

  const edges = [
    // Coworker owns loop
    ...operators.flatMap((operator) =>
      (operator.loops ?? [])
        .filter((loop) => loop.status !== "archived")
        .map((loop) => ({ from: `operator:${operator.id}`, to: `loop:${loop.id}` })),
    ),
    // Coworker is a member of group
    ...groups.flatMap(({ group, members }) =>
      members
        .filter((member) => operators.some((operator) => operator.id === member.operator_id))
        .map((member) => ({ from: `group:${group.id}`, to: `operator:${member.operator_id}` })),
    ),
  ];

  return (
    <BrainView
      nodes={nodes}
      edges={edges}
      hasAnyOperators={operators.length > 0}
    />
  );
}
