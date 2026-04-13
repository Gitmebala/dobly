"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import type { WorkflowRun } from "@/types";

export default function RunHistoryClient({
  workflowId,
  runs,
}: {
  workflowId: string;
  runs: WorkflowRun[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);

  function replay(run: WorkflowRun) {
    startTransition(async () => {
      setMessage("");
      setPendingRunId(run.id);
      const response = await fetch(`/api/workflows/${workflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(run.trigger_payload ?? {}),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Replay failed.");
        setPendingRunId(null);
        return;
      }

      setMessage("Replay queued successfully.");
      setPendingRunId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-[1rem] border border-[rgba(0,223,160,0.16)] bg-[rgba(0,223,160,0.08)] px-4 py-3 text-sm text-text">
          {message}
        </div>
      ) : null}

      {runs.map((run) => (
        <div key={run.id} className="card-hover">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className={run.status === "success" ? "badge-green" : "badge-muted"}>{run.status}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-text-dim">{run.trigger_type}</span>
              </div>
              <p className="mt-3 text-sm text-text-muted">{new Date(run.started_at).toLocaleString()}</p>
              {run.error_message ? <p className="mt-2 text-sm text-red-300">{run.error_message}</p> : null}
            </div>

            <button
              onClick={() => replay(run)}
              disabled={pending && pendingRunId === run.id}
              className="btn-secondary"
            >
              {pending && pendingRunId === run.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Re-run this
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
