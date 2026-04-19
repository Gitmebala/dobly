"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface IntegrationsForm {
  crm?: {
    provider: "salesforce" | "hubspot" | "pipedrive";
    syncOnCall: boolean;
    createLead: boolean;
    updateContact: boolean;
  };
  dataConnections: Array<{
    connectionId: string;
    syncField: string;
    syncDirection: "read" | "write" | "bidirectional";
  }>;
}

export default function IntegrationsPage() {
  const params = useParams();
  const workflowId = String(params?.id ?? "");
  const [form, setForm] = useState<IntegrationsForm>({
    dataConnections: [],
  });
  const [newConnection, setNewConnection] = useState({
    connectionId: "",
    syncField: "",
    syncDirection: "bidirectional" as "read" | "write" | "bidirectional",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch(`/api/workflows/${workflowId}/agent-config`);
        if (response.ok) {
          const { agentConfig } = await response.json();
          if (agentConfig?.integrations) {
            setForm(agentConfig.integrations);
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

  function addDataConnection() {
    if (newConnection.connectionId && newConnection.syncField) {
      setForm((current) => ({
        ...current,
        dataConnections: [...current.dataConnections, newConnection],
      }));
      setNewConnection({ connectionId: "", syncField: "", syncDirection: "bidirectional" });
    }
  }

  function removeDataConnection(index: number) {
    setForm((current) => ({
      ...current,
      dataConnections: current.dataConnections.filter((_, i) => i !== index),
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
                  integrations: form,
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
        <h2 className="font-display text-2xl font-semibold text-text">Integrations</h2>
        <p className="mt-2 text-text-muted">Set up CRM sync, data connectors, and webhooks</p>
      </div>

      <div className="space-y-6">
        {/* CRM Integrations */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">CRM Integration</h3>

          {form.crm ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text font-medium">
                  Provider:{" "}
                  <span className="capitalize text-accent">{form.crm.provider}</span>
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.crm.syncOnCall}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      crm: current.crm ? { ...current.crm, syncOnCall: e.target.checked } : undefined,
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-text">Sync data during calls</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.crm.createLead}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      crm: current.crm ? { ...current.crm, createLead: e.target.checked } : undefined,
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-text">Create new leads from calls</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.crm.updateContact}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      crm: current.crm ? { ...current.crm, updateContact: e.target.checked } : undefined,
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-text">Update existing contacts</span>
              </label>

              <button
                onClick={() => setForm((current) => ({ ...current, crm: undefined }))}
                className="btn-ghost text-red-400 text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-text-muted">No CRM connected</p>
              <button className="btn-secondary">
                <Plus className="h-4 w-4" />
                Connect CRM
              </button>
            </div>
          )}
        </div>

        {/* Data Connectors */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="font-semibold text-lg text-text mb-4">Data Connectors</h3>

          <div className="space-y-2 mb-4">
            {form.dataConnections.map((connection, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border bg-[rgba(255,255,255,0.02)] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {connection.connectionId}
                  </p>
                  <p className="text-xs text-text-muted">
                    {connection.syncField} ({connection.syncDirection})
                  </p>
                </div>
                <button
                  onClick={() => removeDataConnection(index)}
                  className="text-text-muted hover:text-red-400 ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div>
              <label className="text-xs text-text-muted">Connection ID</label>
              <input
                type="text"
                value={newConnection.connectionId}
                onChange={(e) =>
                  setNewConnection((current) => ({
                    ...current,
                    connectionId: e.target.value,
                  }))
                }
                placeholder="e.g., google_sheets_1"
                className="input mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-text-muted">Sync Field</label>
              <input
                type="text"
                value={newConnection.syncField}
                onChange={(e) =>
                  setNewConnection((current) => ({
                    ...current,
                    syncField: e.target.value,
                  }))
                }
                placeholder="e.g., customer_id"
                className="input mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-text-muted">Sync Direction</label>
              <select
                value={newConnection.syncDirection}
                onChange={(e) =>
                  setNewConnection((current) => ({
                    ...current,
                    syncDirection: e.target.value as any,
                  }))
                }
                className="input mt-1"
              >
                <option value="read">Read Only</option>
                <option value="write">Write Only</option>
                <option value="bidirectional">Bidirectional</option>
              </select>
            </div>

            <button onClick={addDataConnection} className="btn-secondary w-full">
              <Plus className="h-4 w-4" />
              Add Connector
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-[rgba(77,122,255,0.08)] border border-[rgba(77,122,255,0.16)] p-4">
          <p className="text-sm text-text-muted">
            Integrations help your agent access external data and sync information with your
            business systems during calls.
          </p>
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
