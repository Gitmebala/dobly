"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Play, Trash2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export function SkillRowActions({ skillId, procedureKind }: { skillId: string; procedureKind: "instructions" | "browser" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string; screenshotUrl?: string | null } | null>(null);

  async function replay() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/skills/${skillId}/replay`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Replay failed.");
      setResult({
        ok: true,
        detail: `Ran again for real — landed on ${data.result?.finalUrl ?? "the page"}.`,
        screenshotUrl: data.result?.screenshotUrl ?? null,
      });
    } catch (err) {
      setResult({ ok: false, detail: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove this skill.");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="loop-row-menu-trigger" aria-label="Manage this skill">
          <MoreVertical className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="loop-row-menu">
        <div className="loop-row-menu-list">
          {procedureKind === "browser" ? (
            <button type="button" onClick={replay} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run it again
            </button>
          ) : null}
          <button type="button" className="loop-row-menu-danger-text" onClick={remove} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
        {result ? (
          <div className="skill-replay-result">
            <p className={result.ok ? "loop-drawer-reveal-note" : "loop-drawer-error"}>{result.detail}</p>
            {result.screenshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a
              // real-time replay screenshot from Supabase storage, not a
              // static asset Next's image optimizer needs to touch.
              <img src={result.screenshotUrl} alt="What the skill saw" className="skill-replay-screenshot" />
            ) : null}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
