"use client";

import { useMemo, useState } from "react";
import { Globe, Loader2, Save, Sparkles } from "lucide-react";
import type { BusinessProfile } from "@/types";

type FaqEntry = { question: string; answer: string };

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function BusinessProfileEditor({
  initialProfile,
}: {
  initialProfile: BusinessProfile | null;
}) {
  const [websiteUrl, setWebsiteUrl] = useState(initialProfile?.website_url ?? "");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    business_name: initialProfile?.business_name ?? "",
    business_type: initialProfile?.business_type ?? "",
    description: initialProfile?.description ?? "",
    opening_hours: initialProfile?.opening_hours ?? "",
    brand_voice: initialProfile?.brand_voice ?? "",
    context_summary: initialProfile?.context_summary ?? "",
    locationsText: (initialProfile?.locations ?? []).join("\n"),
    policiesText: (initialProfile?.policies ?? []).join("\n"),
    sourceUrlsText: (initialProfile?.source_urls ?? []).join("\n"),
    contactEmail: String(initialProfile?.contact_details?.email ?? ""),
    contactPhone: String(initialProfile?.contact_details?.phone ?? ""),
    contactAddress: String(initialProfile?.contact_details?.address ?? ""),
  });
  const [faqs, setFaqs] = useState<FaqEntry[]>(
    initialProfile?.faq_entries?.length
      ? initialProfile.faq_entries
      : [{ question: "", answer: "" }]
  );

  const completeness = useMemo(() => {
    let score = 0;
    if (form.business_name.trim()) score += 1;
    if (websiteUrl.trim()) score += 1;
    if (form.description.trim()) score += 1;
    if (form.context_summary.trim()) score += 1;
    if (splitLines(form.locationsText).length) score += 1;
    if (faqs.some((item) => item.question.trim() && item.answer.trim())) score += 1;
    return Math.round((score / 6) * 100);
  }, [faqs, form, websiteUrl]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAnalyze() {
    if (!websiteUrl.trim()) {
      setMessage("Enter a website first.");
      return;
    }

    setAnalyzing(true);
    setMessage("");

    try {
      const response = await fetch("/api/business-profile/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: websiteUrl,
          business_name: form.business_name || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Dobly could not analyze that website.");
        return;
      }

      const draft = data.draft ?? {};
      setForm((current) => ({
        ...current,
        business_name: String(draft.business_name ?? current.business_name ?? ""),
        business_type: String(draft.business_type ?? current.business_type ?? ""),
        description: String(draft.description ?? current.description ?? ""),
        opening_hours: String(draft.opening_hours ?? current.opening_hours ?? ""),
        brand_voice: String(draft.brand_voice ?? current.brand_voice ?? ""),
        context_summary: String(draft.context_summary ?? current.context_summary ?? ""),
        locationsText: Array.isArray(draft.locations) ? draft.locations.join("\n") : current.locationsText,
        policiesText: Array.isArray(draft.policies) ? draft.policies.join("\n") : current.policiesText,
        sourceUrlsText: Array.isArray(draft.source_urls) ? draft.source_urls.join("\n") : current.sourceUrlsText,
        contactEmail: String(draft.contact_details?.email ?? current.contactEmail ?? ""),
        contactPhone: String(draft.contact_details?.phone ?? current.contactPhone ?? ""),
        contactAddress: String(draft.contact_details?.address ?? current.contactAddress ?? ""),
      }));
      if (Array.isArray(draft.faq_entries) && draft.faq_entries.length) {
        setFaqs(
          draft.faq_entries.map((item: { question?: string; answer?: string }) => ({
            question: String(item.question ?? ""),
            answer: String(item.answer ?? ""),
          }))
        );
      }
      setMessage("Dobly drafted the business context. Review it before saving.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.business_name,
          business_type: form.business_type || null,
          website_url: websiteUrl || null,
          description: form.description || null,
          locations: splitLines(form.locationsText),
          opening_hours: form.opening_hours || null,
          contact_details: {
            email: form.contactEmail || null,
            phone: form.contactPhone || null,
            address: form.contactAddress || null,
          },
          brand_voice: form.brand_voice || null,
          faq_entries: faqs.filter((item) => item.question.trim() && item.answer.trim()),
          policies: splitLines(form.policiesText),
          source_urls: splitLines(form.sourceUrlsText),
          context_summary: form.context_summary || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Failed to save business profile.");
        return;
      }

      setMessage("Business context saved. Dobly will reuse it while generating new agents and automations.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-text-dim">Business context</div>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text">
              Set your business up once, then let Dobly reuse it everywhere.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
              Dobly can draft this from your website, then you only review and tighten the details before using it in live agents and automations.
            </p>
          </div>
          <div className="badge-muted">{completeness}% complete</div>
        </div>
      </section>

      <section className="card space-y-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-display uppercase tracking-[0.18em] text-text-dim">
              Website
            </label>
            <input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              className="input"
              placeholder="https://yourbusiness.com"
            />
          </div>
          <div className="md:self-end">
            <button type="button" onClick={handleAnalyze} disabled={analyzing} className="btn-secondary">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Analyze website
            </button>
          </div>
        </div>

        {message ? (
          <div className="rounded-[1rem] border border-accent/20 bg-accent-dim px-4 py-3 text-sm text-text">
            {message}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="card space-y-4">
            <h2 className="font-display text-2xl font-semibold text-text">Core business profile</h2>
            <Field label="Business name">
              <input value={form.business_name} onChange={(e) => updateField("business_name", e.target.value)} className="input" />
            </Field>
            <Field label="Business type">
              <input value={form.business_type} onChange={(e) => updateField("business_type", e.target.value)} className="input" placeholder="Clinic, salon, agency, ecommerce store..." />
            </Field>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} className="input min-h-[120px]" />
            </Field>
            <Field label="Context summary">
              <textarea value={form.context_summary} onChange={(e) => updateField("context_summary", e.target.value)} className="input min-h-[120px]" placeholder="Short operational summary Dobly should keep in mind while generating systems." />
            </Field>
            <Field label="Opening hours">
              <textarea value={form.opening_hours} onChange={(e) => updateField("opening_hours", e.target.value)} className="input min-h-[90px]" placeholder="Mon-Fri 8am-6pm, Sat 9am-3pm..." />
            </Field>
          </section>

          <section className="card space-y-4">
            <h2 className="font-display text-2xl font-semibold text-text">Knowledge and policies</h2>
            <Field label="Locations">
              <textarea value={form.locationsText} onChange={(e) => updateField("locationsText", e.target.value)} className="input min-h-[120px]" placeholder="One location per line" />
            </Field>
            <Field label="Policies">
              <textarea value={form.policiesText} onChange={(e) => updateField("policiesText", e.target.value)} className="input min-h-[140px]" placeholder="One policy per line" />
            </Field>
            <Field label="Brand voice">
              <textarea value={form.brand_voice} onChange={(e) => updateField("brand_voice", e.target.value)} className="input min-h-[120px]" placeholder="Friendly, concise, professional, warm..." />
            </Field>
            <Field label="Source URLs">
              <textarea value={form.sourceUrlsText} onChange={(e) => updateField("sourceUrlsText", e.target.value)} className="input min-h-[120px]" placeholder="One URL per line" />
            </Field>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-4">
            <h2 className="font-display text-2xl font-semibold text-text">Contact details</h2>
            <Field label="Email">
              <input value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} className="input" />
            </Field>
            <Field label="Phone">
              <input value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} className="input" />
            </Field>
            <Field label="Address">
              <textarea value={form.contactAddress} onChange={(e) => updateField("contactAddress", e.target.value)} className="input min-h-[100px]" />
            </Field>
          </section>

          <section className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-text">FAQs</h2>
              <button
                type="button"
                onClick={() => setFaqs((current) => [...current, { question: "", answer: "" }])}
                className="btn-ghost"
              >
                <Sparkles className="h-4 w-4" />
                Add FAQ
              </button>
            </div>

            <div className="space-y-4">
              {faqs.map((entry, index) => (
                <div key={`${index}-${entry.question}`} className="rounded-[1rem] border border-border bg-surface px-4 py-4">
                  <Field label={`Question ${index + 1}`}>
                    <input
                      value={entry.question}
                      onChange={(e) =>
                        setFaqs((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, question: e.target.value } : item
                          )
                        )
                      }
                      className="input"
                    />
                  </Field>
                  <Field label="Answer">
                    <textarea
                      value={entry.answer}
                      onChange={(e) =>
                        setFaqs((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, answer: e.target.value } : item
                          )
                        )
                      }
                      className="input min-h-[110px]"
                    />
                  </Field>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save business context
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-display uppercase tracking-[0.18em] text-text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}
