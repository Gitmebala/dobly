"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from "lucide-react";

type CoworkerOption = { id: string; name: string };
type ProcedureKind = "instructions" | "browser";
type ActionType = "click" | "type" | "wait" | "wait_for" | "extract_text" | "screenshot";
type ActionRow = { id: string; type: ActionType; selector: string; text: string; ms: number };

const ACTION_LABELS: Record<ActionType, string> = {
  click: "Click something",
  type: "Type into a field",
  wait: "Wait a moment",
  wait_for: "Wait for something to appear",
  extract_text: "Read the text on the page",
  screenshot: "Take a screenshot",
};

const STEPS = ["Basics", "How it works", "Details", "Review"] as const;

function newActionRow(): ActionRow {
  return { id: Math.random().toString(36).slice(2), type: "click", selector: "", text: "", ms: 1000 };
}

export function TeachSkillFlow({ coworkers }: { coworkers: CoworkerOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [kind, setKind] = useState<ProcedureKind>("instructions");
  const [instructions, setInstructions] = useState("");
  const [url, setUrl] = useState("");
  const [actions, setActions] = useState<ActionRow[]>([newActionRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateAction(id: string, patch: Partial<ActionRow>) {
    setActions((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function canAdvance() {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return true;
    if (step === 2) {
      if (kind === "instructions") return instructions.trim().length > 0;
      return /^https?:\/\//i.test(url) && actions.length > 0;
    }
    return true;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body =
        kind === "instructions"
          ? { name: name.trim(), description: description.trim(), operatorId: operatorId || null, procedureKind: "instructions", instructions: instructions.trim() }
          : {
              name: name.trim(),
              description: description.trim(),
              operatorId: operatorId || null,
              procedureKind: "browser",
              url: url.trim(),
              actions: actions.map((row) => {
                if (row.type === "click") return { type: "click", selector: row.selector };
                if (row.type === "type") return { type: "type", selector: row.selector, text: row.text };
                if (row.type === "wait") return { type: "wait", ms: row.ms };
                if (row.type === "wait_for") return { type: "wait_for", selector: row.selector };
                if (row.type === "extract_text") return { type: "extract_text", selector: row.selector || undefined };
                return { type: "screenshot" };
              }),
            };

      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save this skill.");
      router.push("/dashboard/skills");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div className="card skill-stepper">
      <div className="skill-stepper-progress">
        {STEPS.map((label, index) => (
          <div key={label} className="skill-stepper-step" data-state={index === step ? "active" : index < step ? "done" : "upcoming"}>
            <span className="skill-stepper-dot">{index < step ? <Check className="h-3 w-3" /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="loop-drawer-body">
          <h2 className="font-display text-xl font-semibold text-text">What should this skill be called?</h2>
          <label className="loop-drawer-label">
            Name
            <input className="ref-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Shopify revenue report" maxLength={120} />
          </label>
          <label className="loop-drawer-label">
            What it's for (optional)
            <input className="ref-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Pull last week's orders and total them up" maxLength={500} />
          </label>
          {coworkers.length > 0 ? (
            <label className="loop-drawer-label">
              Belongs to (optional)
              <select className="ref-input loop-drawer-select" value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
                <option value="">Any coworker can use it</option>
                {coworkers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="loop-drawer-body">
          <h2 className="font-display text-xl font-semibold text-text">How does Dobly learn this?</h2>
          <div className="loop-drawer-sources">
            <label className="loop-drawer-source" data-checked={kind === "instructions"} onClick={() => setKind("instructions")}>
              <input type="radio" checked={kind === "instructions"} onChange={() => setKind("instructions")} />
              <span><strong>Describe the steps</strong><small>You explain what to do in plain language — Dobly follows it as a playbook.</small></span>
            </label>
            <label className="loop-drawer-source" data-checked={kind === "browser"} onClick={() => setKind("browser")}>
              <input type="radio" checked={kind === "browser"} onChange={() => setKind("browser")} />
              <span><strong>A real website procedure</strong><small>Give it a starting page and the exact clicks/typing — it replays them exactly, every time.</small></span>
            </label>
          </div>
        </div>
      ) : null}

      {step === 2 && kind === "instructions" ? (
        <div className="loop-drawer-body">
          <h2 className="font-display text-xl font-semibold text-text">Walk it through the steps</h2>
          <label className="loop-drawer-label">
            Steps
            <textarea
              className="ref-input ref-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={"1. Open the Shopify orders page\n2. Filter to the last 7 days\n3. Total the order amounts\n4. Send a short summary"}
            />
          </label>
        </div>
      ) : null}

      {step === 2 && kind === "browser" ? (
        <div className="loop-drawer-body">
          <h2 className="font-display text-xl font-semibold text-text">What page, and what happens there?</h2>
          <label className="loop-drawer-label">
            Starting page
            <input className="ref-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </label>
          <div className="loop-drawer-label">
            Steps
            <div className="skill-action-list">
              {actions.map((row, index) => (
                <div key={row.id} className="skill-action-row">
                  <span className="skill-action-index">{index + 1}</span>
                  <select className="ref-input skill-action-type" value={row.type} onChange={(e) => updateAction(row.id, { type: e.target.value as ActionType })}>
                    {(Object.keys(ACTION_LABELS) as ActionType[]).map((type) => <option key={type} value={type}>{ACTION_LABELS[type]}</option>)}
                  </select>
                  {(row.type === "click" || row.type === "wait_for" || row.type === "extract_text") ? (
                    <input className="ref-input" placeholder={row.type === "extract_text" ? "Selector (optional — leave blank for whole page)" : "CSS selector, e.g. #submit-button"} value={row.selector} onChange={(e) => updateAction(row.id, { selector: e.target.value })} />
                  ) : null}
                  {row.type === "type" ? (
                    <>
                      <input className="ref-input" placeholder="CSS selector" value={row.selector} onChange={(e) => updateAction(row.id, { selector: e.target.value })} />
                      <input className="ref-input" placeholder="Text to type" value={row.text} onChange={(e) => updateAction(row.id, { text: e.target.value })} />
                    </>
                  ) : null}
                  {row.type === "wait" ? (
                    <input className="ref-input" type="number" min={0} max={5000} placeholder="Milliseconds" value={row.ms} onChange={(e) => updateAction(row.id, { ms: Number(e.target.value) })} />
                  ) : null}
                  <button type="button" className="skill-action-remove" onClick={() => setActions((prev) => prev.filter((r) => r.id !== row.id))} aria-label="Remove step">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="ref-button skill-action-add" onClick={() => setActions((prev) => [...prev, newActionRow()])}>
              <Plus className="h-3.5 w-3.5" /> Add a step
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="loop-drawer-body">
          <h2 className="font-display text-xl font-semibold text-text">Ready to save</h2>
          <div className="skill-review">
            <div><strong>{name}</strong>{description ? <p>{description}</p> : null}</div>
            <div className="skill-review-kind">
              {kind === "instructions" ? (
                <p>Followed as a playbook: <em>{instructions.slice(0, 200) || "(no steps written)"}</em></p>
              ) : (
                <p>Real browser procedure on <em>{url || "(no URL set)"}</em> — {actions.length} step{actions.length === 1 ? "" : "s"}.</p>
              )}
            </div>
          </div>
          {error ? <p className="loop-drawer-error">{error}</p> : null}
        </div>
      ) : null}

      <div className="skill-stepper-footer">
        <button type="button" className="ref-button skill-stepper-back" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="ref-button" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canAdvance()}>
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" className="ref-button" onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save skill"}
          </button>
        )}
      </div>
    </div>
  );
}
