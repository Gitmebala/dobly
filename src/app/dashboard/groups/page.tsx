import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { listOperatorGroups } from "@/lib/operator-groups";
import { CreateGroupDrawer } from "@/components/dashboard/CreateGroupDrawer";

export const metadata = { title: "Groups" };

function timeAgo(iso: string | null) {
  if (!iso) return "no messages yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function GroupsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [operators, groups] = await Promise.all([
    listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []),
    listOperatorGroups({ userId: user.id }).catch(() => [] as Awaited<ReturnType<typeof listOperatorGroups>>),
  ]);

  const activeCoworkers = operators
    .filter((operator) => operator.status === "active")
    .map((operator) => ({ id: operator.id, name: operator.name, mission: operator.mission }));

  return (
    <div className="workflows-page mx-auto max-w-5xl space-y-4">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Groups</div>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Rooms where your coworkers talk to each other</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Put two or more coworkers together and watch them figure things out — each one only speaks up when it's actually relevant to them.
            </p>
          </div>
          {activeCoworkers.length >= 2 ? <CreateGroupDrawer coworkers={activeCoworkers} /> : null}
        </div>
      </section>

      {groups.length === 0 ? (
        <section className="card text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-dim text-accent">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold text-text">No groups yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            {activeCoworkers.length < 2
              ? "Hire at least 2 coworkers first, then put them in a room together."
              : "Create a group and give it something to figure out together."}
          </p>
        </section>
      ) : (
        <section className="home-list">
          {groups.map(({ group, members }) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`} className="home-list-row">
              <span className="home-list-main">
                <strong>{group.name}</strong>
                <small>{members.map((member) => member.name).join(", ")}{group.purpose ? ` · ${group.purpose}` : ""}</small>
              </span>
              <span className="home-list-meta">
                <time>{timeAgo(group.last_message_at)}</time>
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
