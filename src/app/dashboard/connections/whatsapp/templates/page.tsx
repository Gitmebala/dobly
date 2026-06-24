"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { WhatsAppTemplate } from "@/lib/whatsapp/templates";

export default function WhatsAppTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadTemplates() {
      try {
        // In a real implementation, you'd fetch from your API
        // const response = await fetch('/api/whatsapp/templates');
        // const data = await response.json();
        // setTemplates(data);
        setTemplates([]);
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  function getStatusColor(status: string): string {
    switch (status) {
      case "APPROVED":
        return "text-green-500";
      case "PENDING":
        return "text-yellow-500";
      case "REJECTED":
        return "text-red-500";
      case "DISABLED":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  }

  function getStatusBadge(status: string): string {
    switch (status) {
      case "APPROVED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "REJECTED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "DISABLED":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-text-muted">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-text">WhatsApp Templates</h2>
          <p className="mt-2 text-text-muted">
            Manage your WhatsApp message templates for marketing, utility, and authentication messages.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Create Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center">
          <div className="mb-4 text-4xl">📱</div>
          <h3 className="mb-2 text-lg font-medium text-text">No templates yet</h3>
          <p className="mb-6 text-text-muted">
            Create your first WhatsApp template to start sending structured messages.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead className="border-b border-border bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-text">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-text">Category</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-text">Language</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-text">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-text">Last Used</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-text">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-border">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text">{template.name}</div>
                  </td>
                  <td className="px-6 py-4 text-text-muted">{template.category}</td>
                  <td className="px-6 py-4 text-text-muted">{template.language}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadge(template.status)}`}>
                      {template.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {template.lastUpdated ? new Date(template.lastUpdated).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm text-accent hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-surface p-6">
            <h3 className="mb-4 text-xl font-semibold text-text">Create WhatsApp Template</h3>
            <p className="mb-6 text-sm text-text-muted">
              Templates must be approved by Meta before they can be used. This process typically takes 24-48 hours.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g., order_confirmation"
                  className="input"
                />
                <p className="mt-1 text-xs text-text-muted">
                  Only lowercase letters, numbers, and underscores. Max 512 characters.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Category</label>
                <select className="input">
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Language</label>
                <select className="input">
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="sw_KE">Swahili (Kenya)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Message Body</label>
                <textarea
                  rows={4}
                  placeholder="Hello {{1}}, your order {{2}} has been confirmed."
                  className="input"
                />
                <p className="mt-1 text-xs text-text-muted">
                  {"Use {{1}}, {{2}} for variables. Max 1024 characters."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button className="btn-primary">
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
