"use client";

import { useState } from "react";
import { ArrowRight, Check, Globe, Loader2, Sparkles } from "lucide-react";
import type { BusinessProfile } from "@/types";

// The conversational first-time business-context flow the spec calls for:
// one question at a time, Dobly paraphrasing understanding back, instead
// of a 13-field form up front. Saves through the same real
// /api/business-profile PUT and /api/business-profile/analyze endpoints
// the full editor already uses — this is a different manner of asking,
// not a different backend.

type Step = "intro" | "name" | "about" | "customers" | "website" | "extra" | "review";

const STEP_ORDER: Step[] = ["intro", "name", "about", "customers", "website", "extra", "review"];

export function BusinessContextConversation({
  onDone,
  onEditManually,
}: {
  onDone: () => void;
  onEditManually: () => void;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [customers, setCustomers] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [extra, setExtra] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedNote, setAnalyzedNote] = useState("");
  const [draft, setDraft] = useState<Partial<BusinessProfile> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function goTo(next: Step) {
    setError("");
    setStep(next);
  }

  function advance() {
    const index = STEP_ORDER.indexOf(step);
    goTo(STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)]);
  }

  async function analyzeWebsite() {
    if (!websiteUrl.trim()) {
      advance();
      return;
    }
    setAnalyzing(true);
    setError("");
    try {
      const response = await fetch("/api/business-profile/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url: websiteUrl, business_name: name || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Dobly could not read that website — you can still continue without it.");
        return;
      }
      setDraft(data.draft ?? null);
      const found = [
        data.draft?.business_type ? "what you do" : null,
        data.draft?.opening_hours ? "opening hours" : null,
        Array.isArray(data.draft?.faq_entries) && data.draft.faq_entries.length ? "some FAQs" : null,
        Array.isArray(data.draft?.policies) && data.draft.policies.length ? "a few policies" : null,
      ].filter(Boolean);
      setAnalyzedNote(found.length ? `Found ${found.join(", ")}.` : "Didn't find much there — no problem, you can add details yourself.");
      advance();
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const contextSummary = customers.trim() ? `Customers: ${customers.trim()}` : draft?.context_summary || null;
      const response = await fetch("/api/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: name.trim() || draft?.business_name || "",
          business_type: draft?.business_type ?? null,
          website_url: websiteUrl.trim() || null,
          description: about.trim() || draft?.description || null,
          locations: draft?.locations ?? [],
          opening_hours: draft?.opening_hours ?? null,
          contact_details: draft?.contact_details ?? {},
          brand_voice: draft?.brand_voice ?? null,
          faq_entries: draft?.faq_entries ?? [],
          policies: [...(extra.trim() ? [extra.trim()] : []), ...((draft?.policies as string[]) ?? [])],
          source_urls: websiteUrl.trim() ? [websiteUrl.trim()] : [],
          context_summary: contextSummary,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not save the business context.");
        return;
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="biz-convo">
      {step === "intro" ? (
        <div className="biz-convo-step biz-convo-intro">
          <Sparkles size={22} />
          <h2>Let's build your workspace.</h2>
          <p>I'll ask a few things so I can actually help — not a form, just a conversation.</p>
          <button type="button" className="biz-convo-primary" onClick={advance}>Start <ArrowRight size={15} /></button>
          <button type="button" className="biz-convo-skip" onClick={onEditManually}>I'd rather fill in a form</button>
        </div>
      ) : null}

      {step === "name" ? (
        <ConvoQuestion
          question="What's your business called?"
          onSubmit={advance}
          canSubmit={name.trim().length > 1}
        >
          <input autoFocus className="biz-convo-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Hardware" onKeyDown={(e) => { if (e.key === "Enter" && name.trim().length > 1) advance(); }} />
        </ConvoQuestion>
      ) : null}

      {step === "about" ? (
        <ConvoQuestion
          acknowledge={name ? `${name}. Got it.` : undefined}
          question="What do you do, in a sentence or two?"
          onSubmit={advance}
          canSubmit={about.trim().length > 4}
        >
          <textarea autoFocus className="biz-convo-input biz-convo-textarea" rows={3} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="We sell building materials to contractors and homeowners in Eldoret." />
        </ConvoQuestion>
      ) : null}

      {step === "customers" ? (
        <ConvoQuestion
          acknowledge="That helps."
          question="And who usually buys from you?"
          onSubmit={advance}
          canSubmit={customers.trim().length > 2}
        >
          <input autoFocus className="biz-convo-input" value={customers} onChange={(e) => setCustomers(e.target.value)} placeholder="Contractors, small builders, and walk-in homeowners" onKeyDown={(e) => { if (e.key === "Enter" && customers.trim().length > 2) advance(); }} />
        </ConvoQuestion>
      ) : null}

      {step === "website" ? (
        <ConvoQuestion
          question="Want Dobly to learn more from your website?"
          hint="Optional — Dobly will read it and draft the rest for you to review."
          onSubmit={analyzeWebsite}
          canSubmit
          submitLabel={websiteUrl.trim() ? (analyzing ? "Reading…" : "Learn from this site") : "Skip this"}
          submitIcon={analyzing ? <Loader2 size={15} className="animate-spin" /> : websiteUrl.trim() ? <Globe size={15} /> : <ArrowRight size={15} />}
          disabled={analyzing}
        >
          <input autoFocus className="biz-convo-input" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourbusiness.com" disabled={analyzing} />
        </ConvoQuestion>
      ) : null}

      {step === "extra" ? (
        <ConvoQuestion
          acknowledge={analyzedNote || undefined}
          question="Anything Dobly should always know — a policy, your hours, a house rule?"
          hint="Optional. You can add more later from Knowledge."
          onSubmit={advance}
          canSubmit
          submitLabel="Continue"
        >
          <textarea autoFocus className="biz-convo-input biz-convo-textarea" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="We don't offer delivery outside Eldoret. Open 8am–6pm, closed Sundays." />
        </ConvoQuestion>
      ) : null}

      {step === "review" ? (
        <div className="biz-convo-step biz-convo-review">
          <span className="biz-convo-eyebrow">Here's what I've got</span>
          <h2>{name || draft?.business_name || "Your business"}</h2>
          <dl>
            {about ? <div><dt>What you do</dt><dd>{about}</dd></div> : null}
            {customers ? <div><dt>Customers</dt><dd>{customers}</dd></div> : null}
            {draft?.business_type ? <div><dt>Type</dt><dd>{String(draft.business_type)}</dd></div> : null}
            {draft?.opening_hours ? <div><dt>Hours</dt><dd>{String(draft.opening_hours)}</dd></div> : null}
            {extra ? <div><dt>Always remember</dt><dd>{extra}</dd></div> : null}
          </dl>
          {error ? <p className="biz-convo-error">{error}</p> : null}
          <div className="biz-convo-review-actions">
            <button type="button" className="biz-convo-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Looks good — continue
            </button>
            <button type="button" className="biz-convo-skip" onClick={onEditManually}>Edit every detail instead</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConvoQuestion({
  acknowledge,
  question,
  hint,
  children,
  onSubmit,
  canSubmit,
  submitLabel = "Continue",
  submitIcon,
  disabled,
}: {
  acknowledge?: string;
  question: string;
  hint?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  canSubmit: boolean;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="biz-convo-step">
      {acknowledge ? <p className="biz-convo-ack">{acknowledge}</p> : null}
      <h2>{question}</h2>
      {hint ? <p className="biz-convo-hint">{hint}</p> : null}
      <div className="biz-convo-field">{children}</div>
      <button type="button" className="biz-convo-primary" onClick={onSubmit} disabled={!canSubmit || disabled}>
        {submitIcon ?? <ArrowRight size={15} />} {submitLabel}
      </button>
    </div>
  );
}
