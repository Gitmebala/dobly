"use client";

import { useState } from "react";
import BusinessProfileEditor from "@/components/dashboard/BusinessProfileEditor";
import { BusinessSetupFlow } from "@/components/dashboard/BusinessSetupFlow";
import type { BusinessProfile } from "@/types";

export function BusinessSetupClient({ initialProfile }: { initialProfile: BusinessProfile | null }) {
  const [setupChoice, setSetupChoice] = useState<"website" | "manual" | null>(
    initialProfile?.business_name ? "manual" : null
  );

  // If they already have a profile, skip the choice screen
  if (initialProfile?.business_name) {
    return <BusinessProfileEditor initialProfile={initialProfile} />;
  }

  // Show the choice screen first
  if (!setupChoice) {
    return <BusinessSetupFlow onChoice={setSetupChoice} initialProfile={initialProfile} />;
  }

  // Show the editor after they've made a choice
  return <BusinessProfileEditor initialProfile={initialProfile} />;
}
