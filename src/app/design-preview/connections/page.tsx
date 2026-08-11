// No-auth preview of the real Connections page.
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import ConnectionsTab from "@/components/dashboard/ConnectionsTab";
import "@/app/dashboard/reference-app.css";

export default function ConnectionsDesignPreviewPage() {
  return (
    <DashboardWorkspace
      profile={{ full_name: "Michael", email: "michael@dobly.io" }}
      isAdmin={false}
      workspaces={[]}
      activeWorkspaceId={null}
    >
      <div className="connections-page mx-auto max-w-6xl">
        <ConnectionsTab planId="free" launchReadyProviderIds={["google", "whatsapp", "slack", "shopify"]} optionalLaunchProviderIds={["mailchimp", "zoom"]} />
      </div>
    </DashboardWorkspace>
  );
}
