"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState("");

  async function handleDecision(decision: "approved" | "rejected") {
    setLoading(decision);
    setError("");
    try {
      const response = await fetch(`/api/approvals/${approvalId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Failed to update approval.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button onClick={() => handleDecision("approved")} disabled={Boolean(loading)} className="btn-primary">
          {loading === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Approve
        </button>
        <button onClick={() => handleDecision("rejected")} disabled={Boolean(loading)} className="btn-secondary">
          {loading === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Reject
        </button>
      </div>
      {error ? <div className="text-sm text-red-400">{error}</div> : null}
    </div>
  );
}
