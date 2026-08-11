"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  Link2,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import { BusinessSetupClient } from "@/components/dashboard/BusinessSetupClient";
import ConnectionsTab from "@/components/dashboard/ConnectionsTab";
import OperatorHandleBar from "@/components/dashboard/OperatorHandleBar";
import type { BusinessProfile, PlanId } from "@/types";

type ApprovalMode = "supervised" | "ask_first" | "approve_risky" | "trusted";

const APPROVAL_OPTIONS: Array<{ id: ApprovalMode; title: string; copy: string }> = [
  { id: "supervised", title: "Watch only", copy: "Dobly drafts and prepares everything. Nothing goes out until you say so." },
  { id: "ask_first", title: "Ask before every action", copy: "Dobly asks before sending, publishing, or spending anything at all." },
  { id: "approve_risky", title: "Ask only when it matters", copy: "Routine work runs on its own. Money, customer-facing, or irreversible actions still wait for you." },
  { id: "trusted", title: "Trusted", copy: "Dobly runs the role end to end and only escalates real exceptions." },
];

const FIRST_JOB_CHOICES = [
  { label: "Chase unpaid invoices", prompt: "Follow up on unpaid invoices, remind customers, and ask before escalating.", detail: "Reminders, follow-ups, aging reports" },
  { label: "Reply to customers", prompt: "Answer incoming customer messages and questions, and ask before anything unusual.", detail: "Email, WhatsApp, or web chat" },
  { label: "Watch stock levels", prompt: "Watch inventory and stock levels and alert me before anything runs out.", detail: "Low-stock alerts, reorder reminders" },
  { label: "Something recurring", prompt: "Handle a recurring weekly task and check in with me on progress.", detail: "Reports, check-ins, scheduled work" },
] as const;

const STEP_META = [
  { key: "business", label: "The business", icon: Building2 },
  { key: "connect", label: "One connection", icon: Link2 },
  { key: "hire", label: "First coworker", icon: UserRoundPlus },
  { key: "leash", label: "The leash", icon: ShieldCheck },
] as const;

export default function OnboardingWizard({
  firstName,
  hasBusinessContext,
  hasConnection,
  hasWorkflow,
  businessProfile,
  planId,
  operator,
  launchReadyProviderIds,
  optionalLaunchProviderIds,
}: {
  firstName: string;
  hasBusinessContext: boolean;
  hasConnection: boolean;
  hasWorkflow: boolean;
  businessProfile: BusinessProfile | null;
  planId: PlanId;
  operator: { id: string; name: string; approvalMode: string } | null;
  launchReadyProviderIds?: string[];
  optionalLaunchProviderIds?: string[];
}) {
  const router = useRouter();
  const [deployedOperator, setDeployedOperator] = useState(operator);
  const [revealing, setRevealing] = useState(false);
  const [leashSaving, setLeashSaving] = useState(false);
  const [leashError, setLeashError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ApprovalMode>(
    (deployedOperator?.approvalMode as ApprovalMode) || "approve_risky",
  );
  // Only a brand-new account with zero progress sees the welcome
  // screen - someone returning to resume setup goes straight back to
  // whichever step they were on, not through the intro again.
  const [showWelcome, setShowWelcome] = useState(!hasBusinessContext && !hasConnection && !hasWorkflow);
  const [skipping, setSkipping] = useState(false);
  // The chip picked on the welcome question seeds the "hire" step's
  // prompt, so answering "what do you want off your plate" up front
  // actually carries through instead of being decorative.
  const [seededPrompt, setSeededPrompt] = useState("");

  function chooseFirstJob(prompt: string) {
    setSeededPrompt(prompt);
    setShowWelcome(false);
  }

  async function skipOnboarding() {
    setSkipping(true);
    try {
      await fetch("/api/onboarding/skip", { method: "POST" });
    } finally {
      router.push("/dashboard");
    }
  }

  const stepIndex = useMemo(() => {
    if (!hasBusinessContext) return 0;
    if (!hasConnection) return 1;
    if (!hasWorkflow && !deployedOperator) return 2;
    return 3;
  }, [hasBusinessContext, hasConnection, hasWorkflow, deployedOperator]);

  function recheck() {
    router.refresh();
  }

  async function confirmLeash() {
    if (!deployedOperator) return;
    setLeashSaving(true);
    setLeashError(null);
    try {
      const response = await fetch(`/api/operators/${deployedOperator.id}/leash`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvalMode: selectedMode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not save the leash setting.");
      setRevealing(true);
      // Land inside the coworker that was just hired, not a generic
      // dashboard - onboarding's job is to get one thing working, and
      // "working" means being in the room where the work happens.
      window.setTimeout(
        () => router.push(`/dashboard/coworkers?operatorId=${deployedOperator.id}&justOnboarded=1`),
        1600,
      );
    } catch (err) {
      setLeashError(err instanceof Error ? err.message : "Could not save the leash setting.");
    } finally {
      setLeashSaving(false);
    }
  }

  if (revealing) {
    return (
      <div className="onboard-reveal">
        <Sparkles className="onboard-reveal-icon" />
        <h1>Your workspace is live, {firstName}.</h1>
        <p>{deployedOperator?.name ?? "Your first coworker"} is on the clock.</p>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="onboard-welcome">
        <span className="onboard-step-eyebrow">Welcome, {firstName}</span>
        <h1>What's the first thing you want off your plate?</h1>
        <p>
          Pick the closest one, or describe it yourself. Dobly proposes a coworker for it — with a name, a mission,
          and the tools it needs — and you hire them in a couple minutes.
        </p>
        <div className="onboard-welcome-chips" role="list">
          {FIRST_JOB_CHOICES.map((choice) => (
            <button
              key={choice.prompt}
              type="button"
              role="listitem"
              className="onboard-welcome-chip"
              onClick={() => chooseFirstJob(choice.prompt)}
            >
              <strong>{choice.label}</strong>
              <small>{choice.detail}</small>
            </button>
          ))}
        </div>
        <div className="onboard-welcome-actions">
          <button type="button" className="onboard-skip-link" onClick={() => chooseFirstJob("")}>
            Something else <ArrowRight size={13} />
          </button>
          <button type="button" className="onboard-skip-link" onClick={skipOnboarding} disabled={skipping}>
            {skipping ? "Skipping…" : "Skip setup for now"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-wizard">
      <div className="onboard-wizard-progress" aria-label="Setup progress">
        {STEP_META.map((step, index) => {
          const Icon = step.icon;
          const state = index < stepIndex ? "done" : index === stepIndex ? "active" : "locked";
          return (
            <div className="onboard-progress-item" key={step.key} data-state={state}>
              <span className="onboard-progress-dot">{state === "done" ? <Check size={13} /> : <Icon size={13} />}</span>
              <span className="onboard-progress-label">{step.label}</span>
            </div>
          );
        })}
      </div>

      <div className="onboard-wizard-panel">
        {stepIndex === 0 ? (
          <section className="onboard-step" key="business">
            <StepHead
              eyebrow="Step 1 of 4"
              title="Tell Dobly about the business"
              copy="Just enough for Dobly to sound like it belongs here: the name, what you do, and who for."
            />
            <div className="onboard-step-body">
              <BusinessSetupClient initialProfile={businessProfile} />
            </div>
            <StepFooter onContinue={recheck} continueLabel="Continue" onSkip={skipOnboarding} skipping={skipping} />
          </section>
        ) : stepIndex === 1 ? (
          <section className="onboard-step" key="connect">
            <StepHead
              eyebrow="Step 2 of 4"
              title="Connect one place where work happens"
              copy="Pick the one system your first outcome actually needs. Everything else can wait."
            />
            <div className="onboard-step-body">
              <ConnectionsTab
                planId={planId}
                launchReadyProviderIds={launchReadyProviderIds}
                optionalLaunchProviderIds={optionalLaunchProviderIds}
                mode="modal"
              />
            </div>
            <p className="onboard-step-note">Connecting opens right here — sign in in the popup, and Dobly picks it up automatically. No need to leave this page.</p>
            <StepFooter onContinue={recheck} continueLabel="I've connected — continue" onSkip={skipOnboarding} skipping={skipping} />
          </section>
        ) : stepIndex === 2 ? (
          <section className="onboard-step" key="hire">
            <StepHead
              eyebrow="Step 3 of 4"
              title="Hire your first coworker"
              copy="Describe the job in plain language. Dobly proposes who does it, with what tools, under what rules."
            />
            <div className="onboard-step-body">
              <OperatorHandleBar
                compact
                initialPrompt={seededPrompt}
                onDeployed={(result) => {
                  setDeployedOperator({ id: result.operatorId, name: result.operatorName, approvalMode: result.approvalMode });
                  setSelectedMode((result.approvalMode as ApprovalMode) || "approve_risky");
                }}
              />
            </div>
            <footer className="onboard-step-footer">
              <button type="button" className="onboard-skip-link" onClick={skipOnboarding} disabled={skipping}>
                {skipping ? "Skipping…" : "Skip setup for now"}
              </button>
            </footer>
          </section>
        ) : (
          <section className="onboard-step" key="leash">
            <StepHead
              eyebrow="Step 4 of 4"
              title="Set the leash"
              copy={`${deployedOperator?.name ?? "This coworker"} starts on a short leash. Loosen it as trust builds — you can change this anytime.`}
            />
            <div className="onboard-leash-options">
              {APPROVAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="onboard-leash-option"
                  data-selected={selectedMode === option.id}
                  onClick={() => setSelectedMode(option.id)}
                >
                  <span className="onboard-leash-radio" aria-hidden="true" />
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.copy}</small>
                  </span>
                </button>
              ))}
            </div>
            {leashError ? <p className="onboard-step-error">{leashError}</p> : null}
            <StepFooter onContinue={confirmLeash} continueLabel="Activate my workspace" loading={leashSaving} onSkip={skipOnboarding} skipping={skipping} />
          </section>
        )}
      </div>
    </div>
  );
}

function StepHead({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <header className="onboard-step-head">
      <span className="onboard-step-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}

function StepFooter({
  onContinue,
  continueLabel,
  loading,
  onSkip,
  skipping,
}: {
  onContinue: () => void;
  continueLabel: string;
  loading?: boolean;
  onSkip?: () => void;
  skipping?: boolean;
}) {
  return (
    <footer className="onboard-step-footer">
      <button type="button" className="onboard-continue-button" onClick={onContinue} disabled={loading}>
        {loading ? <Loader2 className="onboard-spin" size={15} /> : <ArrowRight size={15} />}
        {continueLabel}
      </button>
      {onSkip ? (
        <button type="button" className="onboard-skip-link" onClick={onSkip} disabled={skipping}>
          {skipping ? "Skipping…" : "Skip setup for now"}
        </button>
      ) : null}
    </footer>
  );
}
