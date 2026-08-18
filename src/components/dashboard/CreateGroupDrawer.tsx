"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Users } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type CoworkerOption = { id: string; name: string; mission: string };

export function CreateGroupDrawer({ coworkers }: { coworkers: CoworkerOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("create") === "true") setOpen(true);
  }, [searchParams]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function resetAndClose() {
    setOpen(false);
    setTimeout(() => { setName(""); setPurpose(""); setSelected([]); setError(null); }, 200);
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Give this group a name."); return; }
    if (selected.length < 2) { setError("Pick at least 2 coworkers to put in a room together."); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/operator-groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), purpose: purpose.trim(), operatorIds: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create this group.");
      resetAndClose();
      router.push(`/dashboard/groups/${data.group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <SheetTrigger asChild>
        <button type="button" className="ref-button">
          <Plus className="h-4 w-4" />
          New group
        </button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>New group</SheetTitle>
          <SheetDescription>Put coworkers in a room together. Each one decides for itself whether to speak up.</SheetDescription>
        </SheetHeader>
        <SheetBody className="loop-drawer-body">
          <label className="loop-drawer-label">
            Name
            <input className="ref-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product Launch" maxLength={120} />
          </label>

          <label className="loop-drawer-label">
            What this room is for (optional)
            <input className="ref-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Coordinating the September launch" maxLength={500} />
          </label>

          <div className="loop-drawer-label">
            Who's in the room
            <div className="group-member-picker">
              {coworkers.map((coworker) => {
                const checked = selected.includes(coworker.id);
                return (
                  <label key={coworker.id} className="group-member-option" data-checked={checked}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(coworker.id)} />
                    <span className="group-member-avatar"><Users className="h-3.5 w-3.5" /></span>
                    <span>
                      <strong>{coworker.name}</strong>
                      <small>{coworker.mission}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {error ? <p className="loop-drawer-error">{error}</p> : null}
        </SheetBody>
        <SheetFooter>
          <button type="button" className="ref-button loop-drawer-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create group"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
