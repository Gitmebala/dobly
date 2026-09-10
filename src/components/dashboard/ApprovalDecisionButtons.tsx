"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { apiSend } from "@/lib/api-client";

export default function ApprovalDecisionButtons({ approvalId }: { approvalId: string }) {
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Which button was pressed, so the spinner appears on that one. A single
  // isPending flag put the spinner on Approve even when Reject was clicked.
  const [deciding, setDeciding] = useState<"approved" | "rejected" | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: "approved" | "rejected") {
    setError(null);
    setDeciding(decision);
    startTransition(async () => {
      // apiSend never rejects. A raw fetch here meant a dropped connection
      // silently re-enabled the buttons with no message: the owner pressed
      // Approve, nothing happened, and nothing said why.
      const outcome = await apiSend(`/api/approvals/${approvalId}/decision`, { decision });
      setDeciding(null);
      if (!outcome.ok) {
        setError(outcome.error);
        return;
      }
      setDone(decision);
    });
  }

  if (done) {
    return <span className="badge-muted capitalize">{done}</span>;
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("approved")}
          className="btn-primary disabled:opacity-50"
        >
          {isPending && deciding === "approved" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("rejected")}
          className="btn-secondary disabled:opacity-50"
        >
          {isPending && deciding === "rejected" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Reject
        </button>
      </div>
      {error ? (
        <div
          role="alert"
          className="max-w-[220px] text-xs leading-5"
          style={{ color: "var(--app-rust-dark)" }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
