"use client";

import { WandSparkles } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DepartmentRecordKind } from "@/lib/department-records";

export default function RecordActionButton({
  kind,
  recordId,
}: {
  kind: DepartmentRecordKind;
  recordId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createAction() {
    setLoading(true);
    try {
      const response = await fetch("/api/department-records/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kind, recordId }),
      });

      if (!response.ok) {
        throw new Error("Could not create record action.");
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-secondary px-3 py-2 text-xs"
      onClick={createAction}
      disabled={loading}
      title="Turn this record into Dobly work"
    >
      <WandSparkles className="h-3.5 w-3.5" />
      {loading ? "Creating..." : "Create action"}
    </button>
  );
}
