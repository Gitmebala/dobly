import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="dashboard-error">
      <code>404 · no such screen</code>
      <h1>That page moved.</h1>
      <p>
        Dobly was consolidated around coworkers, loops, and approvals — some
        older screens folded into those. Head back to the workspace and you
        will find what you were looking for.
      </p>
      <Link href="/dashboard" className="dashboard-error-link">
        <ArrowLeft aria-hidden="true" /> Back to the workspace
      </Link>
    </div>
  );
}
