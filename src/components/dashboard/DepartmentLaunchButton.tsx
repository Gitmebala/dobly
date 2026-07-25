"use client";

import { Rocket } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepartmentLaunchButton({ departmentId, hasWorkers }: { departmentId: string; hasWorkers: boolean }) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launchDepartment() {
    setLaunching(true);
    setError(null);
    try {
      const response = await fetch("/api/departments/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ departmentId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not launch this department.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not launch this department.");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="dept-launch-control">
      <button type="button" className="dept-launch-button" onClick={launchDepartment} disabled={launching}>
        <Rocket size={16} />
        {launching ? "Launching..." : hasWorkers ? "Re-launch department" : "Launch department"}
      </button>
      {error ? <span className="dept-launch-error">{error}</span> : null}
    </div>
  );
}
