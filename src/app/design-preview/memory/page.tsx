// No-auth preview of the real Knowledge (business memory) page — same
// purpose as ../page.tsx. BusinessMemoryClient takes no props (it fetches
// its own data client-side), so this just needs the real shell around it.
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import BusinessMemoryClient from "@/components/dashboard/BusinessMemoryClient";
import "@/app/dashboard/reference-app.css";

export default function MemoryDesignPreviewPage() {
  return (
    <DashboardWorkspace
      profile={{ full_name: "Michael", email: "michael@dobly.io" }}
      isAdmin={false}
      workspaces={[]}
      activeWorkspaceId={null}
    >
      <div className="ref-page memory-page">
        <header className="ref-header">
          <div>
            <div className="ref-greeting">Business memory</div>
            <h1>Give every coworker the same brain.</h1>
            <p className="ref-subtitle">
              Policies, FAQs, offers, tone, customer notes, and decisions your coworkers draw on when they act for the business.
            </p>
          </div>
        </header>
        <BusinessMemoryClient />
      </div>
    </DashboardWorkspace>
  );
}
