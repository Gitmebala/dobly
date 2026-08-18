"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Send, Users } from "lucide-react";
import type { GroupMessageRecord, GroupMemberRecord, OperatorGroupRecord } from "@/lib/operator-groups";

const MATERIALS = ["clay", "stone", "slate", "wood", "kraft", "gold"] as const;
function materialFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return MATERIALS[hash % MATERIALS.length];
}

export function GroupRoom({
  group,
  members,
  initialMessages,
}: {
  group: OperatorGroupRecord;
  members: GroupMemberRecord[];
  initialMessages: GroupMessageRecord[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;

    setDraft("");
    setError(null);
    setSending(true);
    // Optimistic: show the user's own message immediately, then reconcile
    // with real saved rows (real ids) once the operators' turn resolves -
    // each member's real reply can take a few seconds, sequentially, so
    // this can genuinely take 10-20s for a full room. That's expected.
    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, group_id: group.id, role: "user", operator_id: null, body, metadata: {}, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await fetch(`/api/operator-groups/${group.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send this message.");

      setMessages((prev) => [
        ...prev.filter((message) => message.id !== optimisticId),
        data.userMessage,
        ...data.replies,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  async function removeGroup() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/operator-groups/${group.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove this group.");
      router.push("/dashboard/groups");
      router.refresh();
    } catch {
      setRemoving(false);
    }
  }

  return (
    <div className="group-room">
      <header className="group-room-header">
        <div>
          <Link href="/dashboard/groups" className="group-room-back">← Groups</Link>
          <h1 className="font-display text-xl font-bold text-text">{group.name}</h1>
          {group.purpose ? <p className="group-room-purpose">{group.purpose}</p> : null}
        </div>
        <div className="group-room-roster">
          {members.map((member) => (
            <span key={member.operator_id} className="group-room-roster-chip" data-material={materialFor(member.operator_id)}>
              {member.name}
            </span>
          ))}
          <button type="button" className="group-room-remove" onClick={removeGroup} disabled={removing}>
            {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
          </button>
        </div>
      </header>

      <div className="group-room-thread" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="group-room-empty">
            <Users className="h-5 w-5" />
            <p>Say something to the room. Each coworker decides for itself whether to respond.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="group-room-message" data-role={message.role}>
              {message.role !== "user" ? (
                <span className="group-room-message-avatar" data-material={materialFor(message.operator_id ?? "system")}>
                  {(message.operator_name ?? "D")[0]}
                </span>
              ) : null}
              <div className="group-room-message-body">
                {message.role !== "user" ? <strong>{message.operator_name ?? "Dobly"}</strong> : null}
                <p>{message.body}</p>
              </div>
            </div>
          ))
        )}
        {sending ? (
          <div className="group-room-thinking">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            The room is reading and deciding who wants to respond…
          </div>
        ) : null}
      </div>

      {error ? <p className="loop-drawer-error group-room-error">{error}</p> : null}

      <form
        className="group-room-composer"
        onSubmit={(event) => { event.preventDefault(); send(); }}
      >
        <input
          className="ref-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${group.name}…`}
          disabled={sending}
        />
        <button type="submit" className="ref-button" disabled={sending || !draft.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
