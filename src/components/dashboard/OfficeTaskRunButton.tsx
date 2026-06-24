"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OfficeTaskRunButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function runTask() {
    setRunning(true);
    try {
      const response = await fetch(`/api/office/tasks/${taskId}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Could not run office task.");
      }

      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-secondary px-3 py-2 text-xs"
      onClick={runTask}
      disabled={running}
      title="Run task"
    >
      <Play className="h-3.5 w-3.5" />
      {running ? "Running..." : "Run"}
    </button>
  );
}
