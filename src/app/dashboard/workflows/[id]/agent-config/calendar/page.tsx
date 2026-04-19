"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

interface BusinessHours {
  monday: { start: string; end: string } | null;
  tuesday: { start: string; end: string } | null;
  wednesday: { start: string; end: string } | null;
  thursday: { start: string; end: string } | null;
  friday: { start: string; end: string } | null;
  saturday: { start: string; end: string } | null;
  sunday: { start: string; end: string } | null;
}

interface CalendarForm {
  provider: "google" | "microsoft" | "calendly" | "slack";
  enabled: boolean;
  checkAvailability: boolean;
  autoBook: boolean;
  calendarIds: string[];
  bufferMinutes: number;
  timezone: string;
  businessHours: BusinessHours;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const DAYS: Array<keyof BusinessHours> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function CalendarPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<CalendarForm>({
    provider: "google",
    enabled: false,
    checkAvailability: false,
    autoBook: false,
    calendarIds: [],
    bufferMinutes: 15,
    timezone: "America/New_York",
    businessHours: {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
      saturday: null,
      sunday: null,
    },
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.calendarIntegration) {
            setForm(agentConfig.calendarIntegration);
          }
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [workflowId]);

  function updateBusinessHours(day: keyof BusinessHours, start?: string, end?: string) {
    setForm((current) => ({
      ...current,
      businessHours: {
        ...current.businessHours,
        [day]:
          start === undefined
            ? null
            : {
                start: start || current.businessHours[day]?.start || "09:00",
                end: end || current.businessHours[day]?.end || "17:00",
              },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/agent-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: {
            definition: {
              operator: {
                agentConfig: {
                  calendarIntegration: form,
                },
              },
            },
          },
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text">Calendar Integration</h2>
        <p className="mt-2 text-text-muted">
          Set up calendar sync, availability checking, and auto-booking
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable Calendar Integration */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((current) => ({ ...current, enabled: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-text">Enable Calendar Integration</span>
        </label>

        {form.enabled && (
          <>
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-text mb-3">Calendar Provider</label>
              <div className="grid gap-3 md:grid-cols-2">
                {["google", "microsoft", "calendly", "slack"].map((provider) => (
                  <button
                    key={provider}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        provider: provider as any,
                      }))
                    }
                    className={`rounded-lg border-2 p-3 text-left transition-all capitalize ${
                      form.provider === provider
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="font-medium text-text">{provider}</div>
                    <div className="text-xs text-text-muted">
                      {provider === "google" && "Google Calendar"}
                      {provider === "microsoft" && "Outlook/Microsoft"}
                      {provider === "calendly" && "Calendly Scheduling"}
                      {provider === "slack" && "Slack Calendar"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.checkAvailability}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, checkAvailability: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-text">Check calendar availability during calls</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoBook}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, autoBook: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-text">Auto-book meetings when possible</span>
              </label>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-text">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((current) => ({ ...current, timezone: e.target.value }))}
                className="input mt-2"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Buffer */}
            <div>
              <label className="block text-sm font-medium text-text">Buffer Between Bookings</label>
              <input
                type="number"
                value={form.bufferMinutes}
                onChange={(e) =>
                  setForm((current) => ({ ...current, bufferMinutes: parseInt(e.target.value) }))
                }
                className="input mt-2"
              />
              <p className="mt-1 text-xs text-text-muted">Minutes to leave between bookings</p>
            </div>

            {/* Business Hours */}
            <div>
              <h3 className="font-medium text-text mb-3">Business Hours</h3>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <label className="w-24 text-sm capitalize text-text">{day}</label>
                    <label className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={form.businessHours[day] !== null}
                        onChange={(e) =>
                          updateBusinessHours(
                            day,
                            e.target.checked
                              ? "09:00"
                              : undefined
                          )
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text">Available</span>
                    </label>
                    {form.businessHours[day] && (
                      <>
                        <input
                          type="time"
                          value={form.businessHours[day]?.start || "09:00"}
                          onChange={(e) =>
                            updateBusinessHours(day, e.target.value, undefined)
                          }
                          className="input"
                        />
                        <span className="text-text-muted">to</span>
                        <input
                          type="time"
                          value={form.businessHours[day]?.end || "17:00"}
                          onChange={(e) =>
                            updateBusinessHours(
                              day,
                              undefined,
                              e.target.value
                            )
                          }
                          className="input"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-border pt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
