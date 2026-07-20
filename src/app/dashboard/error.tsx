"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

// Dashboard-scoped error boundary: a fault in one screen never
// white-screens the workspace. Plain language, one action.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dobly] dashboard error:", error);
  }, [error]);

  return (
    <div className="dashboard-error" role="alert">
      <code>something broke on this screen</code>
      <h1>That didn&apos;t work.</h1>
      <p>
        The rest of the workspace is fine — this screen hit an error. Your
        coworkers keep working and nothing was lost.
        {error.digest ? <> Reference <code>{error.digest}</code>.</> : null}
      </p>
      <button type="button" onClick={reset}>
        <RotateCcw aria-hidden="true" /> Try again
      </button>
    </div>
  );
}
