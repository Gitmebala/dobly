"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActivitySquare, History, Loader2, Pause, Play, Rocket, Settings2, Trash2 } from "lucide-react";
import type { WorkflowStatus } from "@/types";

export default function WorkflowListActions({
  workflowId,
  status,
}: {
  workflowId: string;
  status: WorkflowStatus;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"status" | "delete" | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function updateStatus(nextStatus: WorkflowStatus) {
    setLoadingAction("status");
    setMessage(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = data.error ?? "Dobly could not update this workflow.";
        setMessage({ tone: "error", text: error });
        if (nextStatus === "active") {
          router.push(`/dashboard/workflows/${workflowId}/activate`);
        }
        return;
      }

      setMessage({
        tone: "success",
        text: nextStatus === "active" ? "Workflow activated." : "Workflow paused.",
      });
      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  async function remove() {
    const confirmed = window.confirm("Delete this workflow?");
    if (!confirmed) return;

    setLoadingAction("delete");
    setMessage(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage({ tone: "error", text: data.error ?? "Dobly could not delete this workflow." });
        return;
      }

      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/workflows/${workflowId}`} className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
          <Settings2 className="h-3 w-3" />
          Edit
        </Link>
        <Link href={`/dashboard/workflows/${workflowId}/activate`} className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
          <Rocket className="h-3 w-3" />
          Review
        </Link>
        <Link href={`/dashboard/workflows/${workflowId}/runs`} className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
          <ActivitySquare className="h-3 w-3" />
          Runs
        </Link>
        <Link href={`/dashboard/workflows/${workflowId}/versions`} className="btn-ghost px-3 py-1.5 text-xs gap-1.5">
          <History className="h-3 w-3" />
          Versions
        </Link>
        <button
          onClick={() => updateStatus(status === "active" ? "paused" : "active")}
          className="btn-ghost px-3 py-1.5 text-xs gap-1.5"
          title={status === "active" ? "Pause" : "Activate"}
          disabled={loadingAction === "status"}
        >
          {loadingAction === "status" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : status === "active" ? (
            <>
              <Pause className="h-3 w-3" /> Pause
            </>
          ) : (
            <>
              <Play className="h-3 w-3" /> Activate
            </>
          )}
        </button>
        <button
          onClick={remove}
          className="btn-ghost px-3 py-1.5 text-xs gap-1.5 hover:bg-red-500/10 hover:text-red-400"
          title="Delete"
          disabled={loadingAction === "delete"}
        >
          {loadingAction === "delete" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-3 w-3" />
              Delete
            </>
          )}
        </button>
      </div>

      {message ? (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            message.tone === "success"
              ? "border-accent/25 bg-accent-dim text-text"
              : "border-red-500/25 bg-red-500/10 text-red-300"
          }`}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
