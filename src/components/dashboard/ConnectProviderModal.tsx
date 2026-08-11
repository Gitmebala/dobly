"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ProviderConnectClient from "@/components/dashboard/ProviderConnectClient";
import { getConnectionProvider } from "@/lib/connection-catalog";
import type { PlanId } from "@/types";

// The in-context "connect without leaving the page" surface: click a
// required tool anywhere (hire review, onboarding, coworker Overview),
// get this modal, connect for real (OAuth opens in a popup, guided/otp
// flows just submit in place), and the page finds out the moment it's
// actually connected — no navigation away and back.
export default function ConnectProviderModal({
  providerId,
  planId = "free",
  open,
  onOpenChange,
  onConnected,
}: {
  providerId: string | null;
  planId?: PlanId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}) {
  const provider = providerId ? getConnectionProvider(providerId) : null;

  return (
    <Dialog open={open && Boolean(provider)} onOpenChange={onOpenChange}>
      <DialogContent className="connect-modal-content sm:max-w-lg">
        <DialogTitle className="sr-only">{provider ? `Connect ${provider.label}` : "Connect"}</DialogTitle>
        {provider ? (
          <ProviderConnectClient
            provider={provider}
            planId={planId}
            mode="modal"
            onConnected={() => {
              onConnected();
              window.setTimeout(() => onOpenChange(false), 900);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
