"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2 } from "lucide-react";
import type { WorkflowVersion } from "@/types";

export default function VersionHistoryClient({
  workflowId,
  versions,
}: {
  workflowId: string;
  versions: WorkflowVersion[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);

  function restore(version: WorkflowVersion) {
    startTransition(async () => {
      setMessage("");
      setPendingVersionId(version.id);
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: version.title,
          description: version.description,
          blueprint: version.blueprint,
          status: "draft",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Restore failed.");
        setPendingVersionId(null);
        return;
      }

      setMessage(`Restored version ${version.version_number} as a draft for review.`);
      setPendingVersionId(null);
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

      {versions.map((version) => (
        <div key={version.id} className="card-hover">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="badge-green">v{version.version_number}</span>
                <span className="text-xs uppercase tracking-[0.2em] text-text-dim">{version.status}</span>
              </div>
              <div className="mt-3 font-display text-xl font-semibold text-text">{version.title}</div>
              <p className="mt-2 text-sm text-text-muted">{version.description}</p>
            </div>

            <button
              onClick={() => restore(version)}
              disabled={pending && pendingVersionId === version.id}
              className="btn-secondary"
            >
              {pending && pendingVersionId === version.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <History className="h-4 w-4" />
              )}
              Restore this version
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
