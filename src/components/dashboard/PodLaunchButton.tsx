"use client";

import { Rocket } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PodLaunchButton({ podId }: { podId: string }) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  async function launchPod() {
    setLaunching(true);
    try {
      const response = await fetch(`/api/pods/${podId}/launch`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Could not launch Pod.");
      }

      router.refresh();
      router.push("/dashboard");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <button type="button" className="btn-primary w-full" onClick={launchPod} disabled={launching}>
      <Rocket className="h-4 w-4" />
      {launching ? "Launching..." : "Launch into Homebase"}
    </button>
  );
}
