"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 text-center">
          <p className="text-sm font-semibold text-[var(--accent)]">Dobly hit a problem</p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--dobly-text)]">Your work is still here.</h1>
          <p className="mt-3 text-base leading-7 text-[var(--dobly-text-muted)]">
            The page could not finish loading. Try it again, or return to the workspace.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button className="btn-primary" onClick={reset}>Try again</button>
            <a className="btn-secondary" href="/dashboard">Workspace</a>
          </div>
        </main>
      </body>
    </html>
  );
}
