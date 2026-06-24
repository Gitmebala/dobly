"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NumberOption {
  phone_number: string;
  friendly_name?: string;
  locality?: string;
  region?: string;
  capabilities?: { voice?: boolean; SMS?: boolean; sms?: boolean };
}

export default function PhoneProvisionPage() {
  const router = useRouter();
  const [country, setCountry] = useState("KE");
  const [areaCode, setAreaCode] = useState("");
  const [contains, setContains] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NumberOption[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSearch() {
    setSearching(true);
    setResults([]);
    setStatus(null);
    try {
      if (country === "KE") {
        const response = await fetch("/api/business-channels/phone/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: "KE", friendlyName: "Dobly Kenya Business Number" }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to request Kenya setup.");
        setStatus(data.nextStep);
        return;
      }

      const query = new URLSearchParams({
        country,
        ...(areaCode ? { areaCode } : {}),
        ...(contains ? { contains } : {}),
      });
      const response = await fetch(`/api/business-channels/phone/provision?${query.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to check numbers.");
      setResults(data.numbers ?? []);
      if (data.nextStep) setStatus(data.nextStep);
    } catch (error) {
      console.error("Failed to check numbers:", error);
      setStatus(error instanceof Error ? error.message : "Failed to check numbers.");
    } finally {
      setSearching(false);
    }
  }

  async function handleProvision() {
    if (!selectedNumber) return;

    setPurchasing(true);
    setStatus(null);
    try {
      const response = await fetch("/api/business-channels/phone/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          country,
          friendlyName: "Dobly Business Number",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to activate number.");
      router.push("/dashboard/connections/phone");
    } catch (error) {
      console.error("Failed to activate number:", error);
      setStatus(error instanceof Error ? error.message : "Failed to activate number.");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Provision Phone Number</h2>
        <p className="mt-2 text-text-muted">
          Request a Dobly number for Reception. Kenya uses the local voice provider first; Twilio is only used for
          international numbers.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-text">Country</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="input">
              <option value="KE">Kenya</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text">Area Code</label>
            <input
              type="text"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              placeholder="Optional"
              className="input"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text">Contains</label>
            <input
              type="text"
              value={contains}
              onChange={(e) => setContains(e.target.value)}
              placeholder="Optional"
              className="input"
            />
          </div>
        </div>

        <button onClick={handleSearch} disabled={searching} className="btn-primary mt-4">
          {searching ? "Checking..." : country === "KE" ? "Request Kenya Setup" : "Search Numbers"}
        </button>
      </div>

      {status && <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">{status}</div>}

      {results.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border bg-surface px-6 py-3">
            <h3 className="font-medium text-text">Available Numbers ({results.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {results.map((number) => (
              <div
                key={number.phone_number}
                className={`flex items-center justify-between px-6 py-4 transition-colors hover:bg-accent/5 ${
                  selectedNumber === number.phone_number ? "bg-accent/10" : ""
                }`}
                onClick={() => setSelectedNumber(number.phone_number)}
              >
                <div>
                  <div className="font-medium text-text">{number.phone_number}</div>
                  <div className="mt-1 text-sm text-text-muted">
                    {number.friendly_name}
                    {number.locality && ` - ${number.locality}`}
                    {number.region && `, ${number.region}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-border px-2 py-1 text-xs text-text-muted">
                    {number.capabilities?.voice && "Voice"}
                    {(number.capabilities?.SMS || number.capabilities?.sms) && " SMS"}
                  </span>
                  <input
                    type="radio"
                    checked={selectedNumber === number.phone_number}
                    onChange={() => setSelectedNumber(number.phone_number)}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedNumber && (
        <div className="rounded-lg border border-accent bg-accent/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-text">Selected Number</h3>
              <p className="mt-1 text-lg font-semibold text-accent">{selectedNumber}</p>
              <p className="mt-2 text-sm text-text-muted">
                Kenya numbers use local provider pricing. International numbers use provider pass-through pricing.
              </p>
            </div>
            <button onClick={handleProvision} disabled={purchasing} className="btn-primary">
              {purchasing ? "Activating..." : "Activate Number"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 font-medium text-text">Launch Routing</h3>
        <p className="text-sm text-text-muted">
          Dobly uses a Kenya local SMS gateway for texts, Africa's Talking for Kenya voice numbers, Meta for
          WhatsApp, and Twilio only when an international route is needed.
        </p>
      </div>
    </div>
  );
}
