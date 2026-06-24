"use client";

import { useEffect, useState } from "react";
import type { WhatsAppTemplate } from "@/lib/whatsapp/templates";

interface WhatsAppTemplateSelectorProps {
  onSelect: (template: WhatsAppTemplate) => void;
  selectedTemplateId?: string;
  category?: "MARKETING" | "UTILITY" | "AUTHENTICATION";
}

export function WhatsAppTemplateSelector({
  onSelect,
  selectedTemplateId,
  category,
}: WhatsAppTemplateSelectorProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadTemplates() {
      try {
        // In a real implementation, fetch from API.
        setTemplates([]);
      } catch (error) {
        console.error("Failed to load templates:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [category]);

  const filteredTemplates = category
    ? templates.filter((template) => template.category === category)
    : templates;

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4">
        <div className="text-sm text-text-muted">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text">WhatsApp Template</label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="input flex w-full items-center justify-between"
        >
          {selectedTemplate ? (
            <span className="text-text">{selectedTemplate.name}</span>
          ) : (
            <span className="text-text-muted">Select a template...</span>
          )}
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen ? (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
            {filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-text-muted">
                No templates available
                {category ? ` for ${category.toLowerCase()}` : ""}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      onSelect(template);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent/10 ${
                      selectedTemplateId === template.id ? "bg-accent/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text">{template.name}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          template.status === "APPROVED"
                            ? "border-green-500/20 bg-green-500/10 text-green-500"
                            : template.status === "PENDING"
                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                              : "border-red-500/20 bg-red-500/10 text-red-500"
                        }`}
                      >
                        {template.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {template.category} {" • "} {template.language}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {selectedTemplate ? (
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-text">{selectedTemplate.name}</div>
              <div className="mt-1 text-xs text-text-muted">
                {selectedTemplate.category} {" • "} {selectedTemplate.language}
              </div>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                selectedTemplate.status === "APPROVED"
                  ? "border-green-500/20 bg-green-500/10 text-green-500"
                  : selectedTemplate.status === "PENDING"
                    ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                    : "border-red-500/20 bg-red-500/10 text-red-500"
              }`}
            >
              {selectedTemplate.status}
            </span>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-text-muted">
        Only approved templates can be used in workflows. Templates typically take 24-48 hours to approve.
      </p>
    </div>
  );
}
