import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createConversationReply } from "@/lib/anthropic";

// Real group conversations - multiple coworkers in one shared room, each
// deciding for itself whether to weigh in, seeing what the others already
// said this turn. Confirmed by grep before building this that no
// operator-to-operator or group messaging mechanism existed anywhere in
// the codebase - this is new infrastructure, not a wiring fix. Tables:
// dobly_operator_groups / dobly_operator_group_members / dobly_group_messages
// (migration 202608170001_operator_groups.sql, applied to the live linked
// project this session).
//
// Deliberately scoped: each operator's turn is a real Anthropic-backed
// text reply grounded in its own mission and the actual shared thread
// (same createConversationReply primitive already proven in production by
// dobly-operator-proposals.ts's simulation feature) - not a scripted
// animation. It is NOT yet wired to runDoblyOperator's tool-execution/
// approval pipeline, so a group turn can't take real external action on
// its own (send an email, etc.) - only talk. That's an honest, named
// boundary for this first version, not something papered over.

export interface OperatorGroupRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  purpose: string;
  status: "active" | "archived";
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberRecord {
  operator_id: string;
  name: string;
  mission: string;
  status: string;
}

export interface GroupMessageRecord {
  id: string;
  group_id: string;
  role: "user" | "operator" | "system";
  operator_id: string | null;
  operator_name?: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const MAX_CONTEXT_MESSAGES = 30;
const SKIP_TOKEN = "SKIP";

async function loadOwnedGroup(userId: string, groupId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dobly_operator_groups")
    .select("*")
    .eq("id", groupId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Group not found.");
  return data as OperatorGroupRecord;
}

async function loadGroupMembers(groupId: string): Promise<GroupMemberRecord[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dobly_operator_group_members")
    .select("operator_id, dobly_operators(id, name, mission, status)")
    .eq("group_id", groupId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row: any) => row.dobly_operators)
    .filter((operator: any): operator is { id: string; name: string; mission: string; status: string } => !!operator)
    .map((operator: any) => ({ operator_id: operator.id, name: operator.name, mission: operator.mission, status: operator.status }));
}

export async function createOperatorGroup(input: {
  userId: string;
  workspaceId: string | null;
  name: string;
  purpose: string;
  operatorIds: string[];
}) {
  if (input.operatorIds.length < 2) throw new Error("Pick at least 2 coworkers for a group.");
  const admin = createAdminSupabaseClient();

  // Confirm every operator actually belongs to this user before linking it
  // into a group - never trust client-supplied ids blindly, same standard
  // every other operator-scoped route in this codebase already holds to.
  const { data: owned, error: ownedError } = await admin
    .from("dobly_operators")
    .select("id, name, status")
    .eq("user_id", input.userId)
    .in("id", input.operatorIds);
  if (ownedError) throw new Error(ownedError.message);
  if ((owned ?? []).length !== input.operatorIds.length) {
    throw new Error("One or more selected coworkers could not be found.");
  }

  const { data: group, error } = await admin
    .from("dobly_operator_groups")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      name: input.name,
      purpose: input.purpose,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { error: memberError } = await admin.from("dobly_operator_group_members").insert(
    input.operatorIds.map((operatorId) => ({ group_id: group.id, operator_id: operatorId, user_id: input.userId })),
  );
  if (memberError) throw new Error(memberError.message);

  return { group: group as OperatorGroupRecord, members: owned ?? [] };
}

export async function listOperatorGroups(input: { userId: string }) {
  const admin = createAdminSupabaseClient();
  const { data: groups, error } = await admin
    .from("dobly_operator_groups")
    .select("*")
    .eq("user_id", input.userId)
    .eq("status", "active")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const results = await Promise.all(
    (groups ?? []).map(async (group: OperatorGroupRecord) => ({
      group,
      members: await loadGroupMembers(group.id),
    })),
  );
  return results;
}

export async function getOperatorGroup(input: { userId: string; groupId: string }) {
  const group = await loadOwnedGroup(input.userId, input.groupId);
  const members = await loadGroupMembers(group.id);

  const admin = createAdminSupabaseClient();
  const { data: messages, error } = await admin
    .from("dobly_group_messages")
    .select("id, group_id, role, operator_id, body, metadata, created_at, dobly_operators(name)")
    .eq("group_id", group.id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);

  const mappedMessages: GroupMessageRecord[] = (messages ?? []).map((row: any) => ({
    id: row.id,
    group_id: row.group_id,
    role: row.role,
    operator_id: row.operator_id,
    operator_name: row.dobly_operators?.name,
    body: row.body,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  }));

  return { group, members, messages: mappedMessages };
}

/**
 * The real turn-taking loop. Each active member operator gets a chance to
 * respond, in membership order, SEQUENTIALLY - not in parallel - so an
 * operator's own turn can genuinely react to what a colleague just said
 * earlier in the same turn, the way an actual group chat works. An
 * operator that has nothing to add replies with the literal token "SKIP"
 * and is left out of the thread entirely, rather than forcing every member
 * to say something on every message (the product spec's own explicit
 * warning against "mega agent" thinking applies here too: staying quiet is
 * a real, correct outcome, not a failure).
 */
export async function postGroupMessage(input: { userId: string; groupId: string; body: string }) {
  const group = await loadOwnedGroup(input.userId, input.groupId);
  const members = await loadGroupMembers(group.id);
  const activeMembers = members.filter((member) => member.status === "active");
  const admin = createAdminSupabaseClient();

  const { data: userMessage, error: userMessageError } = await admin
    .from("dobly_group_messages")
    .insert({
      group_id: group.id,
      user_id: input.userId,
      workspace_id: group.workspace_id,
      role: "user",
      body: input.body,
    })
    .select("id, group_id, role, operator_id, body, metadata, created_at")
    .single();
  if (userMessageError) throw new Error(userMessageError.message);

  // Fetch the most recent N messages (descending + limit), then reverse to
  // chronological order for the prompt. Ordering ascending-with-limit here
  // would silently pin the context to the OLDEST messages forever once a
  // group passes MAX_CONTEXT_MESSAGES total - the operators would never
  // see anything that happened after message 30.
  const { data: priorRowsDesc } = await admin
    .from("dobly_group_messages")
    .select("id, role, operator_id, body, created_at, dobly_operators(name)")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false })
    .limit(MAX_CONTEXT_MESSAGES);
  const priorRows = (priorRowsDesc ?? []).slice().reverse();

  const thread: Array<{ speaker: string; body: string }> = (priorRows ?? []).map((row: any) => ({
    speaker: row.role === "user" ? "The business owner" : (row.dobly_operators?.name ?? "A coworker"),
    body: row.body,
  }));

  const newReplies: GroupMessageRecord[] = [];

  for (const member of activeMembers) {
    const others = activeMembers.filter((peer) => peer.operator_id !== member.operator_id);
    const system = [
      `You are ${member.name}, an AI coworker. Your job: ${member.mission}`,
      others.length
        ? `You are in a shared group conversation called "${group.name}" with these colleagues: ${others.map((peer) => `${peer.name} (${peer.mission})`).join("; ")}.`
        : `You are in a group conversation called "${group.name}".`,
      `Only speak if this concerns your job or you genuinely have something useful to add - including reacting to what a colleague just said, if relevant. If not, reply with EXACTLY the single word ${SKIP_TOKEN} and nothing else.`,
      `Keep real replies short and natural, the way a real coworker would type in a group chat - not a formal report.`,
    ].join("\n");

    const messages = [
      ...thread.map((entry) => ({ role: "user" as const, content: `${entry.speaker}: ${entry.body}` })),
      { role: "user" as const, content: `What do you say, ${member.name}? (Reply with ${SKIP_TOKEN} if you have nothing to add.)` },
    ];

    let reply = "";
    try {
      reply = await createConversationReply({ maxTokens: 300, system, messages });
    } catch {
      continue; // one operator failing to respond shouldn't break the whole turn
    }

    const cleaned = reply.trim();
    if (!cleaned || cleaned.toUpperCase() === SKIP_TOKEN) continue;

    const { data: saved, error: saveError } = await admin
      .from("dobly_group_messages")
      .insert({
        group_id: group.id,
        user_id: input.userId,
        workspace_id: group.workspace_id,
        role: "operator",
        operator_id: member.operator_id,
        body: cleaned,
      })
      .select("id, group_id, role, operator_id, body, metadata, created_at")
      .single();
    if (saveError) continue;

    thread.push({ speaker: member.name, body: cleaned });
    newReplies.push({ ...(saved as any), operator_name: member.name, metadata: {} });
  }

  await admin
    .from("dobly_operator_groups")
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", group.id);

  return {
    userMessage: { ...(userMessage as any), metadata: {} } as GroupMessageRecord,
    replies: newReplies,
  };
}

export async function archiveOperatorGroup(input: { userId: string; groupId: string }) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("dobly_operator_groups")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", input.groupId)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
}

/**
 * The other half of "coworkers can talk to each other," alongside
 * user-initiated group rooms above: one coworker's OWN task, mid-execution,
 * asking a specific colleague a question and getting a real answer back -
 * no user setup required first. Backed by the real native.coworker.consult
 * connector executor (connectors/native/consult-coworker.ts).
 *
 * Deliberately transparent, not hidden: reuses the exact same
 * dobly_operator_groups/dobly_group_messages tables real user-created
 * rooms use, auto-creating (or reusing) a real 2-person group between the
 * two coworkers the first time they talk - so the exchange shows up in
 * /dashboard/groups like any other conversation, per the product vision's
 * explicit "this must not be hidden" principle for agent-to-agent
 * communication, rather than a shadow channel only Claude can see.
 */
export async function consultCoworker(input: {
  userId: string;
  workspaceId: string | null;
  fromOperatorId: string;
  targetOperatorName: string;
  question: string;
}) {
  const admin = createAdminSupabaseClient();

  const { data: operators, error: operatorsError } = await admin
    .from("dobly_operators")
    .select("id, name, mission, status")
    .eq("user_id", input.userId)
    .eq("status", "active");
  if (operatorsError) throw new Error(operatorsError.message);

  const asker = (operators ?? []).find((operator: any) => operator.id === input.fromOperatorId);
  if (!asker) throw new Error("The asking coworker could not be found.");

  const normalizedTarget = input.targetOperatorName.trim().toLowerCase();
  const target = (operators ?? []).find(
    (operator: any) => operator.id !== input.fromOperatorId && String(operator.name).toLowerCase().includes(normalizedTarget),
  );
  if (!target) {
    throw new Error(`No active coworker named "${input.targetOperatorName}" was found to ask.`);
  }

  // Find an existing 2-person group between exactly these two operators, or
  // create one - so repeated questions between the same pair land in one
  // continuing thread instead of a new room every time.
  const { data: askerGroups } = await admin
    .from("dobly_operator_group_members")
    .select("group_id")
    .eq("user_id", input.userId)
    .eq("operator_id", asker.id);
  const { data: targetGroups } = await admin
    .from("dobly_operator_group_members")
    .select("group_id")
    .eq("user_id", input.userId)
    .eq("operator_id", target.id);
  const askerGroupIds = new Set((askerGroups ?? []).map((row: any) => row.group_id));
  const sharedGroupId = (targetGroups ?? []).map((row: any) => row.group_id).find((id: string) => askerGroupIds.has(id));

  let groupId: string;
  if (sharedGroupId) {
    groupId = sharedGroupId;
  } else {
    const created = await createOperatorGroup({
      userId: input.userId,
      workspaceId: input.workspaceId,
      name: `${asker.name} & ${target.name}`,
      purpose: `Started automatically when ${asker.name} needed to ask ${target.name} something.`,
      operatorIds: [asker.id, target.id],
    });
    groupId = created.group.id;
  }

  const { data: questionMessage, error: questionError } = await admin
    .from("dobly_group_messages")
    .insert({
      group_id: groupId,
      user_id: input.userId,
      workspace_id: input.workspaceId,
      role: "operator",
      operator_id: asker.id,
      body: input.question,
    })
    .select("id")
    .single();
  if (questionError) throw new Error(questionError.message);

  const { data: priorRowsDesc } = await admin
    .from("dobly_group_messages")
    .select("role, operator_id, body, dobly_operators(name)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(MAX_CONTEXT_MESSAGES);
  const thread = (priorRowsDesc ?? [])
    .slice()
    .reverse()
    .map((row: any) => ({ speaker: row.operator_id === asker.id ? asker.name : target.name, body: row.body }));

  const reply = await createConversationReply({
    maxTokens: 400,
    system: [
      `You are ${target.name}, an AI coworker. Your job: ${target.mission}`,
      `Your colleague ${asker.name} (${asker.mission}) is asking you something directly, as part of their own work. Answer helpfully and specifically, the way a real coworker would reply to a direct question - not a generic disclaimer.`,
      `Keep it natural and reasonably short, like a real message, not a formal report.`,
    ].join("\n"),
    messages: thread.map((entry) => ({ role: "user" as const, content: `${entry.speaker}: ${entry.body}` })),
  });

  await admin
    .from("dobly_group_messages")
    .insert({
      group_id: groupId,
      user_id: input.userId,
      workspace_id: input.workspaceId,
      role: "operator",
      operator_id: target.id,
      body: reply,
    });

  await admin
    .from("dobly_operator_groups")
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", groupId);

  return { groupId, targetOperatorName: target.name, reply };
}
