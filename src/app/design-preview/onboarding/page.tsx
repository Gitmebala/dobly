"use client";

// No-auth preview of the real conversational business-context onboarding.
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import { BusinessContextConversation } from "@/components/dashboard/BusinessContextConversation";
import "@/app/dashboard/reference-app.css";

export default function OnboardingDesignPreviewPage() {
  return (
    <DashboardWorkspace
      profile={{ full_name: "Michael", email: "michael@dobly.io" }}
      isAdmin={false}
      workspaces={[]}
      activeWorkspaceId={null}
    >
      <div className="ref-page onboard-wizard">
        <div className="onboard-wizard-panel">
          <div className="onboard-step-body">
            <BusinessContextConversation onDone={() => alert("Would save and continue")} onEditManually={() => alert("Would switch to full editor")} />
          </div>
        </div>
      </div>
    </DashboardWorkspace>
  );
}
