"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-main flex min-h-screen flex-col items-center justify-center py-20 text-center">
      <div className="badge-muted mb-5">Something went wrong</div>
      <h1 className="font-display text-5xl font-bold tracking-tight text-text">Dobly hit a problem.</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-text-muted">
        The app caught the failure safely. Try again, or return to the dashboard.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/dashboard" className="btn-secondary">Go to dashboard</Link>
      </div>
    </div>
  );
}
