"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HireOfficeWorkerButton({ templateKey }: { templateKey: string }) {
  const router = useRouter();
  const [hiring, setHiring] = useState(false);

  async function hire() {
    setHiring(true);
    try {
      const response = await fetch("/api/office/workers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateKey }),
      });

      if (!response.ok) {
        throw new Error("Could not hire worker.");
      }

      router.refresh();
    } finally {
      setHiring(false);
    }
  }

  return (
    <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={hire} disabled={hiring}>
      <UserPlus className="h-3.5 w-3.5" />
      {hiring ? "Hiring..." : "Hire"}
    </button>
  );
}
