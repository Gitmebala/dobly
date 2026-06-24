"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Building2, CheckCircle2, Loader2, MessageSquareText, Plug, ShieldCheck, Sparkles } from "lucide-react";
import { BUSINESS_CHANNELS, type BusinessChannelId } from "@/lib/business-channels";
import { DEPARTMENT_BUNDLES, type LaunchDepartmentId } from "@/lib/department-bundles";
import { DOBLY_TRUST_LEVELS, DOBLY_WORK_TYPES, type DoblyTrustLevelId, type DoblyWorkTypeId } from "@/lib/dobly-product-model";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const steps = [
  "Choose launch engine",
  "Tune the operator",
  "Connect Kenya stack",
  "Teach market memory",
  "Run first test",
];

const BUSINESS_TYPES = [
  { id: "owner_led_business", label: "Owner-led business" },
  { id: "solopreneur", label: "Solopreneur" },
  { id: "agency_studio", label: "Agency / studio" },
  { id: "growing_team", label: "Growing team" },
] as const;

const STARTER_MEMORY_PRESETS = [
  "Keep the tone calm, clear, and premium. No robotic filler.",
  "Always leave the person with a clear next step, owner, or deadline.",
  "Pause instead of guessing when money, approvals, or sensitive promises are involved.",
  "Use specifics from the situation. Do not write anything that could fit any company.",
] as const;

const FIRST_OPERATOR_OPTIONS: Array<{
  id: string;
  title: string;
  summary: string;
  departmentId: LaunchDepartmentId;
  standard: string;
  workTypeIds?: DoblyWorkTypeId[];
  trustLevel?: DoblyTrustLevelId;
  testMessage: string;
  memoryHint: string;
}> = [
  {
    id: "kenya_revenue_engine",
    title: "Launch Kenya revenue engine",
    summary: "Research the market, answer leads, collect through Paystack or M-PESA, and follow up through WhatsApp plus local calls/SMS.",
    departmentId: "growth",
    standard: "Dobly should research the market, capture demand, follow up fast, collect money through Kenya-ready rails, and escalate anything risky before it sends or spends.",
    workTypeIds: ["research", "communicate", "coordinate", "monitor"],
    trustLevel: "approval_required",
    testMessage: "A lead in Nairobi asked about pricing, wants to pay by M-PESA, and needs a confident answer today. Research the likely buying concern, draft the reply, and flag the payment path.",
    memoryHint: "Kenya launch mode: move customers from interest to payment with useful research, clear WhatsApp follow-up, local phone/SMS backup, and approval before money-sensitive promises.",
  },
  {
    id: "client_onboarding",
    title: "Set up client onboarding",
    summary: "Turn a new signed client into a clear onboarding flow with welcome messages, tasks, and next-step coordination.",
    departmentId: "operations",
    standard: "Every new client should get a polished welcome, a clear next step, and an internal owner without me chasing people.",
    workTypeIds: ["coordinate", "communicate", "monitor"],
    trustLevel: "approval_required",
    testMessage: "A new client just signed. Draft the welcome message, list the first three onboarding tasks, and flag anything that needs approval.",
    memoryHint: "New clients should feel looked after from the first message.",
  },
  {
    id: "social_posts",
    title: "Generate social media posts",
    summary: "Turn offers, launches, or business updates into social-ready post drafts that sound like the brand.",
    departmentId: "marketing",
    standard: "Every content draft should be specific, on-brand, and ready to review instead of generic idea soup.",
    workTypeIds: ["create", "research", "coordinate"],
    trustLevel: "draft_propose",
    testMessage: "We are launching a premium website audit next week. Draft three strong social posts for Instagram and LinkedIn.",
    memoryHint: "Content should feel premium and useful, never obviously AI-generated.",
  },
  {
    id: "customer_followups",
    title: "Handle customer follow-up",
    summary: "Keep leads, inquiries, and missed conversations moving so no promising customer goes cold.",
    departmentId: "sales",
    standard: "Every live lead or customer follow-up should move the conversation forward with a specific next step.",
    workTypeIds: ["communicate", "coordinate", "monitor"],
    trustLevel: "approval_required",
    testMessage: "A lead asked for pricing on Monday and has gone quiet. Draft a follow-up that feels useful, not pushy.",
    memoryHint: "Follow-ups should feel human and commercially sharp, not templated.",
  },
  {
    id: "operating_briefs",
    title: "Prepare weekly operating briefs",
    summary: "Turn scattered updates into a clean summary with risks, priorities, and what needs a decision.",
    departmentId: "analytics",
    standard: "Every operating brief should surface what matters, what changed, and what needs a decision without fluff.",
    workTypeIds: ["research", "monitor", "decide"],
    trustLevel: "draft_propose",
    testMessage: "Prepare a weekly operating brief that highlights wins, risks, slowdowns, and what needs executive attention.",
    memoryHint: "Summaries should be concise, decision-ready, and never padded.",
  },
  {
    id: "approvals_packets",
    title: "Prepare approval packets",
    summary: "Bundle the context, recommendation, and risk into approval-ready packets for faster decisions.",
    departmentId: "finance",
    standard: "Every approval packet should make the recommendation, evidence, and risk obvious in one pass.",
    workTypeIds: ["decide", "coordinate", "monitor"],
    trustLevel: "approval_required",
    testMessage: "Create an approval packet for a discount request that includes the reason, tradeoffs, and recommended answer.",
    memoryHint: "Approval packets should reduce back-and-forth by making the decision path obvious.",
  },
];

const CUSTOM_OPERATOR_OPTION_ID = "custom";

export default function SetupWizardClient() {
  const [activeStep, setActiveStep] = useState(0);
  const [businessType, setBusinessType] = useState<(typeof BUSINESS_TYPES)[number]["id"]>("owner_led_business");
  const [selectedOperatorId, setSelectedOperatorId] = useState(FIRST_OPERATOR_OPTIONS[0]?.id ?? "client_onboarding");
  const [customProblem, setCustomProblem] = useState("");
  const [departmentId, setDepartmentId] = useState<LaunchDepartmentId>(FIRST_OPERATOR_OPTIONS[0]?.departmentId ?? "reception");
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<DoblyWorkTypeId[]>(FIRST_OPERATOR_OPTIONS[0]?.workTypeIds ?? DEPARTMENT_BUNDLES[0]?.workTypeIds ?? []);
  const [trustLevel, setTrustLevel] = useState<DoblyTrustLevelId>(FIRST_OPERATOR_OPTIONS[0]?.trustLevel ?? DEPARTMENT_BUNDLES[0]?.trustLevel ?? "approval_required");
  const [firstStandard, setFirstStandard] = useState(
    FIRST_OPERATOR_OPTIONS[0]?.standard ?? DEPARTMENT_BUNDLES[0]?.starterStandards[0] ?? "Every important request should get a clear next step without me chasing it.",
  );
  const [channelId, setChannelId] = useState<BusinessChannelId>(DEPARTMENT_BUNDLES[0]?.recommendedChannels[0] ?? "business_email");
  const [identifier, setIdentifier] = useState("");
  const [starterMemoryNote, setStarterMemoryNote] = useState(FIRST_OPERATOR_OPTIONS[0]?.memoryHint ?? STARTER_MEMORY_PRESETS[0]);
  const [testMessage, setTestMessage] = useState(FIRST_OPERATOR_OPTIONS[0]?.testMessage ?? "Hi, I am interested in your service. Can I book an appointment?");
  const [message, setMessage] = useState<string | null>(null);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentDepartment = DEPARTMENT_BUNDLES.find((department) => department.id === departmentId) ?? DEPARTMENT_BUNDLES[0];
  const currentTrust = DOBLY_TRUST_LEVELS.find((level) => level.id === trustLevel);
  const selectedOperator = FIRST_OPERATOR_OPTIONS.find((option) => option.id === selectedOperatorId) ?? FIRST_OPERATOR_OPTIONS[0];
  const recommendedChannels = useMemo(() => {
    const ids = currentDepartment?.recommendedChannels?.length ? currentDepartment.recommendedChannels : BUSINESS_CHANNELS.slice(0, 3).map((channel) => channel.id);
    return ids
      .map((id) => BUSINESS_CHANNELS.find((channel) => channel.id === id))
      .filter((channel): channel is (typeof BUSINESS_CHANNELS)[number] => Boolean(channel));
  }, [currentDepartment]);

  function applyStarterOption(optionId: string) {
    setSelectedOperatorId(optionId);
    const option = FIRST_OPERATOR_OPTIONS.find((entry) => entry.id === optionId);
    if (!option) return;

    const nextDepartment = DEPARTMENT_BUNDLES.find((department) => department.id === option.departmentId);
    setDepartmentId(option.departmentId);
    setSelectedWorkTypes(option.workTypeIds ?? nextDepartment?.workTypeIds ?? []);
    setTrustLevel(option.trustLevel ?? nextDepartment?.trustLevel ?? "approval_required");
    setFirstStandard(option.standard);
    setTestMessage(option.testMessage);
    setStarterMemoryNote(option.memoryHint);
    setChannelId(nextDepartment?.recommendedChannels[0] ?? "business_email");
  }

  function continueToOperator() {
    setMessage(null);
    setActiveStep(1);
  }

  function chooseDepartment(nextDepartmentId: LaunchDepartmentId) {
    const nextDepartment = DEPARTMENT_BUNDLES.find((department) => department.id === nextDepartmentId);
    setDepartmentId(nextDepartmentId);
    if (!nextDepartment) return;
    setSelectedWorkTypes(nextDepartment.workTypeIds);
    setTrustLevel(nextDepartment.trustLevel);
    setFirstStandard((current) => current || nextDepartment.starterStandards[0] || "");
    setChannelId(nextDepartment.recommendedChannels[0] ?? "business_email");
  }

  function toggleWorkType(workTypeId: DoblyWorkTypeId) {
    setSelectedWorkTypes((current) => {
      if (current.includes(workTypeId)) {
        return current.length === 1 ? current : current.filter((id) => id !== workTypeId);
      }

      return [...current, workTypeId];
    });
  }

  function launchDepartment() {
    setMessage(null);
    setRuntimeReady(false);
    startTransition(async () => {
      const response = await fetch("/api/departments/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? `${data.department?.name ?? "Department"} launched.` : data.error ?? "Could not launch department.");
      if (response.ok) setActiveStep(2);
    });
  }

  function connectChannel() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/business-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, externalIdentifier: identifier || null }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? `${data.channel?.title ?? "Channel"} setup started.` : data.error ?? "Could not start channel setup.");
      if (response.ok) setActiveStep(3);
    });
  }

  function skipChannels() {
    setMessage("You can connect channels later from Homebase.");
    setActiveStep(3);
  }

  function addStarterMemory() {
    setMessage(null);
    const selectedTypeLabels = selectedWorkTypes
      .map((workTypeId) => DOBLY_WORK_TYPES.find((workType) => workType.id === workTypeId)?.title)
      .filter((value): value is string => Boolean(value));
    const operatorLabel =
      selectedOperatorId === CUSTOM_OPERATOR_OPTION_ID
        ? customProblem.trim() || "Custom first operator"
        : selectedOperator?.title ?? currentDepartment?.name ?? "First operator";

    startTransition(async () => {
      const response = await fetch("/api/business-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "tone",
          scope: "global",
          title: `${operatorLabel} operating standard`,
          body: [
            `Business type: ${BUSINESS_TYPES.find((type) => type.id === businessType)?.label ?? "Owner-led business"}.`,
            `First operator: ${operatorLabel}.`,
            `Active department: ${currentDepartment?.name ?? "Reception"}.`,
            `Top work types: ${selectedTypeLabels.join(", ") || "Communicate"}.`,
            `Default trust level: ${currentTrust?.title ?? "Approval Required"}.`,
            `First standard: ${firstStandard}`,
            `Starter memory: ${starterMemoryNote || "Helpful, clear, premium, and calm. Escalate uncertainty instead of guessing."}`,
          ].join(" "),
          tags: ["starter", currentDepartment?.id ?? "reception", trustLevel, ...selectedWorkTypes],
        }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? "Starter memory saved." : data.error ?? "Could not save memory.");
      if (response.ok) setActiveStep(4);
    });
  }

  function skipMemory() {
    setMessage("Starter memory skipped for now. You can add it later once Dobly is live.");
    setActiveStep(4);
  }

  function testRuntime() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/communications/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "website_chat",
          from: "setup_test_visitor",
          body: testMessage,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? `Dobly drafted: ${data.draft?.suggestedReply ?? "a response."}` : data.error ?? "Test failed.");
      if (response.ok) setRuntimeReady(true);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="card h-fit">
        <div className="badge-muted text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          Setup
        </div>
        <h2 className="mt-4 font-display text-2xl text-[var(--dobly-text)]">Set up the launch Operator.</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--dobly-text-secondary)]">
          Start with the highest-leverage job: research, follow-up, payments, approvals, and local customer channels. We will shape the operator, hide what is not needed yet, and get to a real first test fast.
        </p>
        <div className="mt-5 space-y-2">
          {steps.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                activeStep === index ? "bg-[rgba(196,80,26,0.14)] text-[var(--dobly-text)]" : "text-[var(--dobly-text-muted)] hover:bg-[rgba(255,255,255,0.035)]"
              }`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(255,255,255,0.06)]">{index + 1}</span>
              {step}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        {activeStep === 0 ? (
          <Panel title="Set up the launch Operator" icon={Sparkles}>
            <p className="text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Choose the engine Dobly should own first. Start with something real, commercial, research-backed, and testable.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {FIRST_OPERATOR_OPTIONS.map((option) => {
                const active = selectedOperatorId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => applyStarterOption(option.id)}
                    className={`rounded-3xl border px-5 py-5 text-left transition ${
                      active
                        ? "border-[rgba(196,80,26,0.42)] bg-[rgba(196,80,26,0.12)]"
                        : "border-[var(--dobly-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <div className="text-lg font-medium text-[var(--dobly-text)]">{option.title}</div>
                    <p className="mt-2 text-sm leading-7 text-[var(--dobly-text-secondary)]">{option.summary}</p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedOperatorId(CUSTOM_OPERATOR_OPTION_ID)}
                className={`rounded-3xl border px-5 py-5 text-left transition ${
                  selectedOperatorId === CUSTOM_OPERATOR_OPTION_ID
                    ? "border-[rgba(196,80,26,0.42)] bg-[rgba(196,80,26,0.12)]"
                    : "border-[var(--dobly-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <div className="text-lg font-medium text-[var(--dobly-text)]">Something else</div>
                <p className="mt-2 text-sm leading-7 text-[var(--dobly-text-secondary)]">
                  Tell Dobly your own first use case and we will shape the operator around that instead.
                </p>
              </button>
            </div>
            {selectedOperatorId === CUSTOM_OPERATOR_OPTION_ID ? (
              <label className="mt-5 block space-y-2">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Describe your first problem</div>
                <textarea
                  value={customProblem}
                  onChange={(event) => setCustomProblem(event.target.value)}
                  className="input-like min-h-[120px] py-3"
                  placeholder="Example: Review inbound supplier messages, summarize anything important, and draft the next reply."
                />
              </label>
            ) : null}
            <div className="mt-5 rounded-2xl border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-[var(--dobly-text-secondary)]">
              Dobly will use this first problem to suggest the operator lane, trust posture, market memory, and first live test.
            </div>
            <button onClick={continueToOperator} className="btn-primary mt-5">
              <ArrowRight className="h-4 w-4" />
              Continue
            </button>
          </Panel>
        ) : null}

        {activeStep === 1 ? (
          <Panel title="Tune the operator" icon={Building2}>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Business type</div>
                <select value={businessType} onChange={(event) => setBusinessType(event.target.value as (typeof BUSINESS_TYPES)[number]["id"])} className="input-like">
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Trust level</div>
                <select value={trustLevel} onChange={(event) => setTrustLevel(event.target.value as DoblyTrustLevelId)} className="input-like">
                  {DOBLY_TRUST_LEVELS.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block space-y-2">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Department fit</div>
              <select value={departmentId} onChange={(event) => chooseDepartment(event.target.value as LaunchDepartmentId)} className="input-like">
                {DEPARTMENT_BUNDLES.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-4 text-sm leading-7 text-[var(--dobly-text-secondary)]">{currentDepartment?.description}</p>
            <div className="mt-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Top work types</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {DOBLY_WORK_TYPES.filter((workType) => currentDepartment?.workTypeIds.includes(workType.id)).map((workType) => {
                  const active = selectedWorkTypes.includes(workType.id);
                  return (
                    <button
                      key={workType.id}
                      type="button"
                      onClick={() => toggleWorkType(workType.id)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        active
                          ? "border-[rgba(196,80,26,0.35)] bg-[rgba(196,80,26,0.12)] text-[var(--dobly-text)]"
                          : "border-[var(--dobly-border)] text-[var(--dobly-text-secondary)]"
                      }`}
                    >
                      {workType.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="mt-5 block space-y-2">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">First standard</div>
              <textarea
                value={firstStandard}
                onChange={(event) => setFirstStandard(event.target.value)}
                className="input-like min-h-[120px] py-3"
                placeholder="Every important customer or internal request should get a clear next step quickly."
              />
            </label>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Likely outputs</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentDepartment?.outputTypeIds.map((output) => (
                    <span key={output} className="rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[var(--dobly-text-secondary)]">
                      {output.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Trust posture</div>
                <div className="mt-3 text-sm text-[var(--dobly-text)]">{currentTrust?.title ?? "Approval Required"}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--dobly-text-secondary)]">{currentTrust?.summary}</p>
              </div>
            </div>
            <button onClick={launchDepartment} disabled={isPending} className="btn-primary mt-5">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Launch operator
            </button>
          </Panel>
        ) : null}

        {activeStep === 2 ? (
          <Panel title="Connect the Kenya stack if you need it" icon={Plug}>
            <p className="text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Dobly can start helping without every system connected. Add the main Kenya execution lane now: WhatsApp, local calls/SMS, Paystack, or direct M-PESA. Everything else can wait.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendedChannels.map((channel) => {
                const active = channelId === channel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setChannelId(channel.id)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      active
                        ? "border-[rgba(196,80,26,0.35)] bg-[rgba(196,80,26,0.12)] text-[var(--dobly-text)]"
                        : "border-[var(--dobly-border)] text-[var(--dobly-text-secondary)]"
                    }`}
                  >
                    {channel.title}
                  </button>
                );
              })}
            </div>
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Number, email, account, or tool name" className="input-like mt-4" />
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={connectChannel} disabled={isPending} className="btn-primary">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Start channel setup
              </button>
              <button type="button" onClick={skipChannels} className="btn-secondary">
                Skip for now
              </button>
            </div>
          </Panel>
        ) : null}

        {activeStep === 3 ? (
          <Panel title="Teach market memory" icon={ShieldCheck}>
            <p className="text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Give Dobly one or two things it should always remember while researching, replying, collecting payment, and escalating this work. Keep it light for now. You can sharpen it later.
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--dobly-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-[var(--dobly-text-secondary)]">
              {STARTER_MEMORY_PRESETS.map((standard) => (
                <button
                  key={standard}
                  type="button"
                  onClick={() => setStarterMemoryNote(standard)}
                  className={`flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition ${
                    starterMemoryNote === standard ? "bg-[rgba(196,80,26,0.12)] text-[var(--dobly-text)]" : "hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--dobly-accent)]" />
                  <span>{standard}</span>
                </button>
              ))}
            </div>
            <label className="mt-4 block space-y-2">
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--dobly-text-dim)]">Optional note</div>
              <textarea
                value={starterMemoryNote}
                onChange={(event) => setStarterMemoryNote(event.target.value)}
                className="input-like min-h-[110px] py-3"
                placeholder="Example: Never promise discounts without approval. Keep the tone calm and premium."
              />
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={addStarterMemory} disabled={isPending} className="btn-primary">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Save market memory
              </button>
              <button type="button" onClick={skipMemory} className="btn-secondary">
                Skip for now
              </button>
            </div>
          </Panel>
        ) : null}

        {activeStep === 4 ? (
          <Panel title="Run the first test" icon={MessageSquareText}>
            <p className="text-sm leading-7 text-[var(--dobly-text-secondary)]">
              Put one realistic Kenya launch situation through Dobly so you can see the research, first draft, payment path, approval posture, and next-step behavior before you go live.
            </p>
            <textarea value={testMessage} onChange={(event) => setTestMessage(event.target.value)} className="input-like min-h-[130px] py-3" />
            <button onClick={testRuntime} disabled={isPending} className="btn-primary mt-4">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Run first test
            </button>
            {runtimeReady ? (
              <div className="mt-5 rounded-2xl border border-[rgba(84,186,123,0.22)] bg-[rgba(84,186,123,0.08)] px-4 py-4">
                <div className="flex items-center gap-3 text-[var(--dobly-text)]">
                  <CheckCircle2 className="h-5 w-5 text-[var(--dobly-accent)]" />
                  <span className="font-medium">Dobly is ready to activate from Homebase.</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--dobly-text-secondary)]">
                  Open Homebase, refine approvals, and expand Dobly from a strong Kenya-first launch operator instead of a giant connector setup project.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/dashboard" className="btn-primary">
                    Open Homebase
                  </Link>
                  <Link href="/dashboard/channels" className="btn-secondary">
                    Channels
                  </Link>
                  <Link href="/dashboard/memory" className="btn-secondary">
                    Memory
                  </Link>
                </div>
              </div>
            ) : null}
          </Panel>
        ) : null}

        {message ? <div className="mt-5 rounded-xl border border-[rgba(84,186,123,0.22)] bg-[rgba(84,186,123,0.08)] px-4 py-3 text-sm text-[var(--dobly-text-secondary)]">{message}</div> : null}
      </section>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(196,80,26,0.13)] text-[var(--dobly-accent)]">
          <Icon className="h-5 w-5" />
        </div>
        <h1 className="font-display text-3xl tracking-[-0.05em] text-[var(--dobly-text)]">{title}</h1>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
