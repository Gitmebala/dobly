import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-main flex min-h-screen flex-col items-center justify-center py-20 text-center">
      <div className="badge-green mb-5">404</div>
      <h1 className="font-display text-5xl font-bold tracking-tight text-text">That page is not here.</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-text-muted">
        The workflow, connection, or route you asked for could not be found.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
        <Link href="/" className="btn-secondary">Open landing page</Link>
      </div>
    </div>
  );
}
