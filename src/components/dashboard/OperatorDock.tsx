"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bot, Loader2, PauseCircle, PlayCircle, ShieldAlert, Sparkles } from "lucide-react";
import type { DoblyBrainData } from "@/components/dashboard/DoblyBrainView";

export default function OperatorDock({ brain }: { brain: DoblyBrainData }) {
  const [localPausedAll, setLocalPausedAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const operators = (brain.operators ?? []).slice(0, 8);
  const pendingApprovals = (brain.approvals ?? []).filter((approval: any) => approval.status === "pending").length;

  function pauseAll(paused: boolean) {
    startTransition(async () => {
      const response = await fetch("/api/operators/pause-all", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paused,
          reason: paused ? "Global pause from Coworker Dock." : "Global resume from Coworker Dock.",
        }),
      });
      if (response.ok) setLocalPausedAll(paused);
    });
  }

  return (
    <aside className="fixed bottom-4 left-1/2 z-40 hidden w-[min(1080px,calc(100vw-2rem))] -translate-x-1/2 rounded-[1.3rem] border border-[rgba(196,80,26,0.24)] bg-[color-mix(in_srgb,var(--dobly-surface)_90%,transparent)] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur-xl xl:block">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 border-r border-[var(--dobly-border)] pr-4">
          <div className="grid h-10 w-10 place-items-center rounded-[0.95rem] bg-[rgba(196,80,26,0.14)] text-[var(--dobly-accent)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-[var(--dobly-text)]">Coworker Dock</div>
            <div className="text-[11px] text-[var(--dobly-text-muted)]">
              {operators.length} visible · {pendingApprovals} approvals
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {operators.length ? (
            operators.map((operator: any) => (
              <Link
                key={operator.id}
                href={`/dashboard/coworkers?operatorId=${encodeURIComponent(operator.id)}`}
                className="min-w-[180px] rounded-[0.95rem] border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.04)] p-3 transition hover:border-[rgba(196,80,26,0.32)] hover:shadow-[0_12px_28px_rgba(196,80,26,0.08)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <Bot className="h-4 w-4 text-[var(--dobly-accent)]" />
                  <span
                    className={
                      operator.status === "active"
                        ? "text-emerald-600"
                        : operator.status === "paused"
                          ? "text-amber-600"
                          : "text-[var(--dobly-text-dim)]"
                    }
                  >
                    {operator.status}
                  </span>
                </div>
                <div className="mt-2 truncate text-xs font-semibold text-[var(--dobly-text)]">{operator.name}</div>
                <div className="mt-1 truncate text-[11px] capitalize text-[var(--dobly-text-muted)]">
                  {operator.kind} · {(operator.dobly_operator_loops ?? operator.loops ?? []).length} loops
                </div>
              </Link>
            ))
          ) : (
            <Link
              href="/dashboard/coworkers"
              className="rounded-[0.95rem] border border-dashed border-[rgba(196,80,26,0.24)] px-4 py-3 text-xs text-[var(--dobly-text-muted)]"
            >
              Create your first coworker from the builder.
            </Link>
          )}
        </div>

        <div className="flex gap-2 border-l border-[var(--dobly-border)] pl-4">
          <Link href="/dashboard/approvals" className="btn-secondary whitespace-nowrap">
            <ShieldAlert className="h-4 w-4" />
            Approvals
          </Link>
          <button
            type="button"
            disabled={isPending}
            onClick={() => pauseAll(!localPausedAll)}
            className="btn-secondary whitespace-nowrap disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : localPausedAll ? (
              <PlayCircle className="h-4 w-4" />
            ) : (
              <PauseCircle className="h-4 w-4" />
            )}
            {localPausedAll ? "Resume all" : "Pause all"}
          </button>
        </div>
      </div>
    </aside>
  );
}
