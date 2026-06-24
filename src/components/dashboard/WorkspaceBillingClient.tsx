"use client";

import { useState } from "react";
import { Check, Loader2, ShieldCheck, Smartphone, Sparkles, WalletCards } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  monthlyPriceUsd: number;
  monthlyPriceKes: number;
  operatingAllowanceMinor: number;
  highlighted?: boolean;
  included: string[];
};

type Usage = {
  metrics: Array<{ metric: string; used: number; limit: number; status: string }>;
};

type Economy = {
  capacity: {
    availableMinor: number;
    reservedMinor: number;
    spendableMinor: number;
    planAllowanceMinor: number;
    remainingPercent: number;
    status: string;
  };
  policy: {
    monthly_cap_minor?: number | null;
    per_action_confirmation_minor?: number;
    auto_top_up_enabled?: boolean;
    auto_top_up_amount_minor?: number;
    auto_top_up_trigger_minor?: number;
    hard_stop?: boolean;
  } | null;
};

export default function WorkspaceBillingClient({ plans, currentPlanId, usage, economy }: { plans: Plan[]; currentPlanId: string; usage: Usage | null; economy: Economy | null }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [autoTopUp, setAutoTopUp] = useState(Boolean(economy?.policy?.auto_top_up_enabled));
  const [monthlyCap, setMonthlyCap] = useState(String((economy?.policy?.monthly_cap_minor ?? 0) / 100 || ""));
  const [topUpAmount, setTopUpAmount] = useState("1000");

  async function checkout(planId: string) {
    setLoading(planId);
    setMessage("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.url) window.location.assign(result.url);
    else setMessage(result.error || "Billing is not configured for this environment yet.");
    setLoading("");
  }

  async function payWithMpesa(planId: string) {
    if (!phoneNumber.trim()) {
      setMessage("Enter the M-Pesa phone number that should receive the payment request.");
      return;
    }
    setLoading(`mpesa:${planId}`);
    setMessage("");
    const response = await fetch("/api/billing/mpesa/renew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, phoneNumber }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? result.customerMessage || "Check your phone to complete payment." : result.error || "M-Pesa payment could not start.");
    setLoading("");
  }

  async function saveControls() {
    setLoading("controls");
    setMessage("");
    const response = await fetch("/api/billing/economy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyCapKes: monthlyCap ? Number(monthlyCap) : null,
        confirmationKes: (economy?.policy?.per_action_confirmation_minor ?? 50_000) / 100,
        autoTopUpEnabled: autoTopUp,
        autoTopUpAmountKes: (economy?.policy?.auto_top_up_amount_minor ?? 0) / 100,
        autoTopUpTriggerKes: (economy?.policy?.auto_top_up_trigger_minor ?? 0) / 100,
        hardStop: true,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Spending controls saved." : result.error || "Spending controls could not be saved.");
    setLoading("");
  }

  async function buyTopUp() {
    setLoading("topup");
    setMessage("");
    const response = await fetch("/api/billing/top-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKes: Number(topUpAmount) }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.url) window.location.assign(result.url);
    else setMessage(result.error || "Activity budget checkout could not start.");
    setLoading("");
  }

  return (
    <div className="ref-page">
      <header className="ref-header"><div><div className="ref-greeting"><Sparkles size={16} /> Plan and usage</div><h1>Billing</h1><p className="ref-subtitle">Understand what Dobly includes, what you have used, and when to expand.</p></div></header>
      <div className="ref-stack">
        <section className="ref-card ref-panel">
          <div className="ref-between"><div><strong>Current plan</strong><h2 style={{ margin: "8px 0 0" }}>{plans.find((plan) => plan.id === currentPlanId)?.name || "Free Desk"}</h2></div><span className="ref-pill green">Active</span></div>
          {message ? <p className="reference-auth__error" style={{ marginTop: 14 }}>{message}</p> : null}
        </section>
        {economy ? <section className="ref-card ref-panel"><div className="ref-between"><div><div className="ref-greeting"><WalletCards size={16} /> Monthly operating capacity</div><h2 style={{ margin: "8px 0 0" }}>{economy.capacity.remainingPercent}% remaining</h2><p className="ref-muted">Your coworkers use this shared allowance automatically. Dobly chooses affordable routes in the background.</p></div><span className={`ref-pill ${economy.capacity.status === "healthy" ? "green" : ""}`}>{economy.capacity.status}</span></div><div className="ref-progress-line" style={{ marginTop: 18 }}><i style={{ width: `${economy.capacity.remainingPercent}%` }} /></div><div className="ref-between" style={{ marginTop: 16 }}><input className="reference-auth__input" aria-label="Activity budget amount" inputMode="numeric" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} /><button className="ref-button" disabled={Boolean(loading)} onClick={buyTopUp}>{loading === "topup" ? <><Loader2 className="animate-spin" size={15} /> Opening</> : "Add activity budget"}</button></div></section> : null}
        <section className="ref-card ref-panel"><div className="ref-between"><div><div className="ref-greeting"><Smartphone size={16} /> M-Pesa</div><h3 style={{ margin: "8px 0 0" }}>Pay or renew from your phone</h3><p className="ref-muted">Dobly sends one STK request. Your plan starts only after M-Pesa confirms payment.</p></div></div><div className="ref-between" style={{ marginTop: 16 }}><input className="reference-auth__input" aria-label="M-Pesa phone number" placeholder="07xx xxx xxx" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /><span className="ref-pill">KES</span></div></section>
        <section className="ref-card ref-panel"><div className="ref-greeting"><ShieldCheck size={16} /> Spending controls</div><div className="ref-grid-3" style={{ marginTop: 16 }}><label className="ref-soft"><strong>Monthly activity cost limit</strong><input className="reference-auth__input" inputMode="numeric" placeholder="Use plan limit" value={monthlyCap} onChange={(event) => setMonthlyCap(event.target.value)} /></label><label className="ref-soft"><strong>Automatic renewal request</strong><input type="checkbox" checked={autoTopUp} onChange={(event) => setAutoTopUp(event.target.checked)} /><span>M-Pesa still asks for your PIN before payment.</span></label><div className="ref-soft"><strong>Hard stop</strong><span>Your bill cannot exceed the limit you set.</span></div></div><button className="ref-button" disabled={Boolean(loading)} onClick={saveControls}>{loading === "controls" ? <><Loader2 className="animate-spin" size={15} /> Saving</> : "Save controls"}</button></section>
        {usage ? <section className="ref-card ref-panel"><h3>Usage this month</h3><div className="ref-grid-3">{usage.metrics.slice(0, 6).map((metric) => <div className="ref-soft ref-usage-live" key={metric.metric}><strong>{metric.metric.replaceAll("_", " ")}</strong><span>{metric.used} / {metric.limit}</span><div className="ref-progress-line"><i style={{ width: `${metric.limit ? Math.min(100, metric.used / metric.limit * 100) : 0}%` }} /></div></div>)}</div></section> : null}
        <section className="ref-grid-3">
          {plans.filter((plan) => plan.id !== "business").map((plan) => {
            const current = plan.id === currentPlanId;
            return <article className={`ref-card ref-panel ref-price-card ${plan.highlighted ? "active" : ""}`} key={plan.id}><div className="ref-between"><h3>{plan.name}</h3>{current ? <span className="ref-pill green">Current</span> : null}</div><p className="ref-muted">{plan.tagline}</p><b>KSh {plan.monthlyPriceKes.toLocaleString()}</b><small> per month</small><div className="ref-plan-features">{plan.included.slice(0, 6).map((item) => <span key={item}><Check size={13} /> {item}</span>)}</div>{plan.id !== "free" && !current ? <button className="ref-button" disabled={Boolean(loading)} onClick={() => payWithMpesa(plan.id)}>{loading === `mpesa:${plan.id}` ? <><Loader2 className="animate-spin" size={15} /> Sending request</> : <><Smartphone size={15} /> Pay with M-Pesa</>}</button> : null}<button className={`ref-button ${plan.highlighted ? "primary" : ""}`} disabled={current || Boolean(loading)} onClick={() => checkout(plan.id)}>{loading === plan.id ? <><Loader2 className="animate-spin" size={15} /> Opening checkout</> : current ? "Current plan" : "Other payment methods"}</button></article>;
          })}
        </section>
      </div>
    </div>
  );
}
