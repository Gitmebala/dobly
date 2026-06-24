"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, UsersRound } from "lucide-react";

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function accept() {
    setState("loading");
    const response = await fetch("/api/workspaces/invitations/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
      return;
    }
    if (!response.ok) {
      setMessage(result.error || "This invitation could not be accepted.");
      setState("error");
      return;
    }
    router.replace("/dashboard/team");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-6 py-16">
      <UsersRound className="h-9 w-9 text-[var(--accent)]" aria-hidden="true" />
      <h1 className="mt-5 text-3xl font-semibold text-text">Join this Dobly workspace</h1>
      <p className="mt-3 text-base leading-7 text-text-muted">Accept using the email address that received the invitation.</p>
      {state === "error" ? <p className="mt-4 text-sm text-red-600" role="alert">{message}</p> : null}
      <button className="btn-primary mt-7 w-fit" onClick={accept} disabled={state === "loading"}>
        {state === "loading" ? "Accepting..." : "Accept invitation"} <ArrowRight className="h-4 w-4" />
      </button>
    </main>
  );
}
