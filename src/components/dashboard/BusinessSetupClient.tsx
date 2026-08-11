"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BusinessProfileEditor from "@/components/dashboard/BusinessProfileEditor";
import { BusinessContextConversation } from "@/components/dashboard/BusinessContextConversation";
import type { BusinessProfile } from "@/types";

export function BusinessSetupClient({ initialProfile }: { initialProfile: BusinessProfile | null }) {
  const router = useRouter();
  // A first-time account (no business_name yet) gets the real
  // conversation the spec asks for — one question at a time, not a
  // 13-field form. Someone who already has a profile goes straight to
  // the full editor, which is the right surface for reviewing/adjusting
  // everything at once, not for a first answer.
  const [wantsFullEditor, setWantsFullEditor] = useState(Boolean(initialProfile?.business_name));

  if (!wantsFullEditor) {
    return (
      <BusinessContextConversation
        onDone={() => router.refresh()}
        onEditManually={() => setWantsFullEditor(true)}
      />
    );
  }

  return <BusinessProfileEditor initialProfile={initialProfile} />;
}
