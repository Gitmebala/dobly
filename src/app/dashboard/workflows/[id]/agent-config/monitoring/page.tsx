"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, Download, MessageSquare, Calendar } from "lucide-react";

interface MonitoringForm {
  recordCalls: boolean;
  transcriptSentiment: boolean;
  keywords: string[];
  reportingEmail: string[];
}

interface CallMetrics {
  totalCalls: number;
  avgDuration: number;
  resolutionRate: number;
  escalationRate: number;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
}

export default function MonitoringPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<MonitoringForm>({
    recordCalls: true,
    transcriptSentiment: true,
    keywords: [],
    reportingEmail: [],
  });
  const [metrics, setMetrics] = useState<CallMetrics>({
    totalCalls: 0,
    avgDuration: 0,
    resolutionRate: 0,
    escalationRate: 0,
    sentimentPositive: 0,
    sentimentNeutral: 0,
    sentimentNegative: 0,
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.monitoring) {
            setForm(agentConfig.monitoring);
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

  function addKeyword() {
    if (newKeyword.trim()) {
      setForm((current) => ({
        ...current,
        keywords: [...current.keywords, newKeyword.trim()],
      }));
      setNewKeyword("");
    }
  }

  function removeKeyword(keyword: string) {
    setForm((current) => ({
      ...current,
      keywords: current.keywords.filter((k) => k !== keyword),
    }));
  }

  function addEmail() {
    if (newEmail.includes("@")) {
      setForm((current) => ({
        ...current,
        reportingEmail: [...current.reportingEmail, newEmail],
      }));
      setNewEmail("");
    }
  }

  function removeEmail(email: string) {
    setForm((current) => ({
      ...current,
      reportingEmail: current.reportingEmail.filter((e) => e !== email),
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
                  monitoring: form,
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
        <h2 className="font-display text-2xl font-semibold text-text">Monitoring & Analytics</h2>
        <p className="mt-2 text-text-muted">
          View call history, transcripts, and performance metrics
        </p>
      </div>

      <div className="space-y-6">
        {/* Key Metrics */}
        <div>
          <h3 className="font-semibold text-lg text-text mb-4">Key Metrics</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-wider text-text-dim">Total Calls</p>
              <p className="mt-2 font-display text-2xl font-semibold text-text">
                {metrics.totalCalls}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-wider text-text-dim">Avg Duration</p>
              <p className="mt-2 font-display text-2xl font-semibold text-text">
                {metrics.avgDuration}s
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-wider text-text-dim">Resolution Rate</p>
              <p className="mt-2 font-display text-2xl font-semibold text-accent">
                {metrics.resolutionRate}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs uppercase tracking-wider text-text-dim">Escalations</p>
              <p className="mt-2 font-display text-2xl font-semibold text-text">
                {metrics.escalationRate}%
              </p>
            </div>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">Sentiment Distribution</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text">Positive</span>
                <span className="text-sm font-semibold text-green-400">
                  {metrics.sentimentPositive}%
                </span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${metrics.sentimentPositive}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text">Neutral</span>
                <span className="text-sm font-semibold text-accent">
                  {metrics.sentimentNeutral}%
                </span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${metrics.sentimentNeutral}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text">Negative</span>
                <span className="text-sm font-semibold text-red-400">
                  {metrics.sentimentNegative}%
                </span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${metrics.sentimentNegative}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recording Settings */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">Recording & Transcription</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.recordCalls}
                onChange={(e) => setForm((current) => ({ ...current, recordCalls: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Record all calls</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.transcriptSentiment}
                onChange={(e) =>
                  setForm((current) => ({ ...current, transcriptSentiment: e.target.checked }))
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-text">Analyze sentiment in transcripts</span>
            </label>
          </div>
        </div>

        {/* Keyword Tracking */}
        <div>
          <h3 className="font-semibold text-lg text-text mb-3">Keywords to Track</h3>
          <div className="space-y-2 mb-3">
            {form.keywords.map((keyword) => (
              <div
                key={keyword}
                className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="flex-1 text-sm text-text">{keyword}</div>
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="text-text-muted hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="E.g., cancel, refund, complaint..."
              className="input flex-1"
            />
            <button onClick={addKeyword} className="btn-secondary">
              Add
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Track mentions of specific topics in call transcripts
          </p>
        </div>

        {/* Reporting Emails */}
        <div>
          <h3 className="font-semibold text-lg text-text mb-3">Report Recipients</h3>
          <div className="space-y-2 mb-3">
            {form.reportingEmail.map((email) => (
              <div
                key={email}
                className="flex items-center gap-2 rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="flex-1 text-sm text-text">{email}</div>
                <button
                  onClick={() => removeEmail(email)}
                  className="text-text-muted hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              placeholder="manager@example.com"
              className="input flex-1"
            />
            <button onClick={addEmail} className="btn-secondary">
              Add
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Send analytics reports to these email addresses
          </p>
        </div>

        {/* Recent Calls */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">Recent Calls</h3>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-text-muted" />
                  <div>
                    <p className="text-sm font-medium text-text">Call #{i}</p>
                    <p className="text-xs text-text-muted">Today at 2:{String(i).padStart(2, "0")}PM</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded">
                    <Eye className="h-4 w-4 text-text-muted hover:text-text" />
                  </button>
                  <button className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded">
                    <Download className="h-4 w-4 text-text-muted hover:text-text" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
