import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOperatorGroup } from "@/lib/operator-groups";
import { GroupRoom } from "@/components/dashboard/GroupRoom";

export const metadata = { title: "Group" };

export default async function GroupRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const result = await getOperatorGroup({ userId: user.id, groupId: id }).catch(() => null);
  if (!result) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <GroupRoom group={result.group} members={result.members} initialMessages={result.messages} />
    </div>
  );
}
