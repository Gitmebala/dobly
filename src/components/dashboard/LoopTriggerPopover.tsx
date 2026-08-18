"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw, Webhook } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// A contextual quick-settings popover anchored to one loop row - not a
// separate page, not a card. Shows the masked trigger URL by default;
// "New link" rotates it and reveals the full value once, same reveal-once
// pattern as creation.
export function LoopTriggerPopover({ loopId, maskedToken }: { loopId: string; maskedToken: string }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/loops/${loopId}/regenerate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not make a new link.");
      setRevealed(data.webhookUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="loop-trigger-chip" onClick={(event) => event.stopPropagation()}>
          <Webhook className="h-3 w-3" />
          Webhook trigger
        </button>
      </PopoverTrigger>
      <PopoverContent onClick={(event) => event.stopPropagation()}>
        <div className="loop-trigger-popover">
          <strong>Trigger link</strong>
          {revealed ? (
            <>
              <code className="loop-drawer-url loop-drawer-url-sm">{revealed}</code>
              <p className="loop-drawer-reveal-note">Save this now — it won't be shown again.</p>
              <button type="button" className="ref-button loop-drawer-copy" onClick={copy}>
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
              </button>
            </>
          ) : (
            <>
              <code className="loop-drawer-url loop-drawer-url-sm loop-drawer-url-masked">…{maskedToken}</code>
              <p className="loop-drawer-reveal-note">
                The full link was only shown once, when this loop was created. Lost it? Make a new one —
                the old link stops working immediately.
              </p>
              <button type="button" className="ref-button loop-drawer-copy" onClick={regenerate} disabled={busy}>
                {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…</> : <><RefreshCw className="h-3.5 w-3.5" /> New link</>}
              </button>
            </>
          )}
          {error ? <p className="loop-drawer-error">{error}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
