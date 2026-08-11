"use client";

// Explicit user complaint: "approvals are too many... not everything is
// risky bro". The per-item buttons already existed; what was missing was
// any way to clear a stack of genuinely low-risk items in one action
// instead of clicking through each one. This only ever touches items this
// page itself already classified as low risk - medium/high risk items are
// deliberately excluded and still require an individual decision.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function BulkApprovalActions({
  runtimeIds,
  officeTaskIds,
}: {
  runtimeIds: string[];
  officeTaskIds: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const total = runtimeIds.length + officeTaskIds.length;
  if (total === 0 || done) return null;

  function approveAll() {
    setError(null);
    startTransition(async () => {
      const results = await Promise.allSettled([
        ...runtimeIds.map((id) =>
          fetch(`/api/approvals/${id}/decision`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ decision: "approved" }),
          }),
        ),
        ...officeTaskIds.map((id) =>
          fetch(`/api/office/tasks/${id}/decision`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ decision: "approved" }),
          }),
        ),
      ]);
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
      if (failed.length > 0) {
        // Don't vanish on partial failure - a silent disappearance here would
        // read as "all approved" when some weren't, exactly the class of bug
        // this app has shipped before. Stay visible with the count so the
        // user knows to check the remaining items individually.
        setError(`${failed.length} of ${total} could not be approved. Try those individually.`);
      } else {
        setDone(true);
      }
      router.refresh();
    });
  }

  return (
    <div className="bulk-approval-bar">
      <p>
        <strong>{total}</strong> of the items below are low risk — nothing customer-facing, no money, no publishing.
      </p>
      <button type="button" className="btn-secondary" disabled={isPending} onClick={approveAll}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Approve all {total} low-risk items
      </button>
      {error ? <span className="bulk-approval-error">{error}</span> : null}
    </div>
  );
}
