"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OfficeTaskDecisionButtons({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "approved" | "rejected" | "cancelled">(null);

  async function decide(decision: "approved" | "rejected" | "cancelled") {
    setLoading(decision);
    try {
      const response = await fetch(`/api/office/tasks/${taskId}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        throw new Error("Could not update office task.");
      }

      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-primary px-4 py-2 text-xs"
        onClick={() => decide("approved")}
        disabled={loading !== null}
      >
        {loading === "approved" ? "Approving..." : "Approve"}
      </button>
      <button
        type="button"
        className="btn-secondary px-4 py-2 text-xs"
        onClick={() => decide("cancelled")}
        disabled={loading !== null}
      >
        {loading === "cancelled" ? "Holding..." : "Hold"}
      </button>
      <button
        type="button"
        className="btn-ghost border border-[rgba(242,232,220,0.08)] px-4 py-2 text-xs text-[var(--danger)]"
        onClick={() => decide("rejected")}
        disabled={loading !== null}
      >
        {loading === "rejected" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
