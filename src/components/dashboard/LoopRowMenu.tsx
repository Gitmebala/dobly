"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Pause, Play, Trash2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// Every loop row's management menu - pause/resume plus a soft-delete with
// one inline confirm step (not a full modal; this is reversible-ish in the
// sense that nothing external gets torn down, just stops running - a modal
// with a typed-name confirmation, the pattern operators/[id]'s DELETE uses,
// is reserved for the actually-irreversible case).
export function LoopRowMenu({ loopId, status }: { loopId: string; status: "active" | "paused" | "archived" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  async function setStatus(next: "active" | "paused" | "archived") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/loops/${loopId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update this loop.");
      setMenuOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setConfirmingRemove(false);
    }
  }

  return (
    <Popover open={menuOpen} onOpenChange={(next) => { setMenuOpen(next); if (!next) setConfirmingRemove(false); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="loop-row-menu-trigger"
          onClick={(event) => event.stopPropagation()}
          aria-label="Manage this loop"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="loop-row-menu" onClick={(event) => event.stopPropagation()}>
        {confirmingRemove ? (
          <div className="loop-row-menu-confirm">
            <p>Remove this loop? It stops running immediately.</p>
            <div className="loop-row-menu-confirm-actions">
              <button type="button" className="ref-button loop-row-menu-danger" onClick={() => setStatus("archived")} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove
              </button>
              <button type="button" className="loop-row-menu-cancel" onClick={() => setConfirmingRemove(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="loop-row-menu-list">
            {status === "active" ? (
              <button type="button" onClick={() => setStatus("paused")} disabled={busy}>
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            ) : (
              <button type="button" onClick={() => setStatus("active")} disabled={busy}>
                <Play className="h-3.5 w-3.5" /> Resume
              </button>
            )}
            <button type="button" className="loop-row-menu-danger-text" onClick={() => setConfirmingRemove(true)} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        )}
        {error ? <p className="loop-drawer-error">{error}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
