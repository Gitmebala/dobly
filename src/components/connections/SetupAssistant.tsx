"use client";

import { useState } from "react";
import type { ConnectionProviderDefinition, EasySetupMethod } from "@/lib/connection-catalog";
import type { PlanId } from "@/types";

interface SetupAssistantProps {
  provider: ConnectionProviderDefinition;
  planId: PlanId;
  onComplete: (credentials: Record<string, string | null>) => void;
  onCancel: () => void;
}

/**
 * SetupAssistant guides users through OAuth, OTP, email-link, guided, and store-based connection flows.
 * Abstracts away technical details and presents human-friendly setup flows.
 */
export function SetupAssistant({ provider, planId, onComplete, onCancel }: SetupAssistantProps) {
  const flow = planId === "pro" || planId === "agency" ? provider.proFlow : provider.starterFlow;
  const [step, setStep] = useState<"start" | "fields" | "advanced" | "complete">("start");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateFields = (fields: any[] | undefined): boolean => {
    if (!fields || fields.length === 0) return true;

    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (!formData[field.key]?.trim()) {
        newErrors[field.key] = `${field.label} is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (flow.method === "oauth") {
      // OAuth: redirect to provider
      if (flow.oauthHref) {
        window.location.href = flow.oauthHref;
      }
    } else if (flow.method === "email-link") {
      // Email-link: validate and send
      if (!validateFields(flow.fields)) return;

      setLoading(true);
      try {
        const response = await fetch("/api/connections/send-verify-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.id,
            ...formData,
          }),
        });

        if (response.ok) {
          setStep("complete");
          onComplete(formData);
        } else {
          const error = await response.json();
          setErrors({ _global: error.message || "Failed to send verification link" });
        }
      } catch (err) {
        setErrors({ _global: "Network error. Please try again." });
      } finally {
        setLoading(false);
      }
    } else if (flow.method === "otp") {
      // OTP: validate and send OTP
      if (!validateFields(flow.fields)) return;

      setLoading(true);
      try {
        const response = await fetch("/api/connections/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.id,
            ...formData,
          }),
        });

        if (response.ok) {
          setStep("fields"); // Show OTP input field
        } else {
          const error = await response.json();
          setErrors({ _global: error.message || "Failed to send OTP" });
        }
      } catch (err) {
        setErrors({ _global: "Network error. Please try again." });
      } finally {
        setLoading(false);
      }
    } else if (flow.method === "guided" || flow.method === "store") {
      // Guided/Store: collect initial fields and optionally ask for advanced
      if (!validateFields(flow.fields)) return;

      if (provider.advancedFields?.length && (planId === "pro" || planId === "agency")) {
        setStep("advanced");
      } else {
        onComplete(formData);
      }
    }
  };

  const handleAdvancedSave = () => {
    onComplete(formData);
  };

  // OAuth step - just show description and button
  if (flow.method === "oauth") {
    return (
      <div className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{flow.title}</h2>
          <p className="text-sm text-gray-600 mt-2">{flow.description}</p>
          {flow.helper && <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">{flow.helper}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {flow.ctaLabel}
          </button>
        </div>
      </div>
    );
  }

  // Guided/Store/Email-link/OTP steps
  return (
    <div className="space-y-6 p-6 max-w-md">
      <div>
        <h2 className="text-lg font-semibold">{flow.title}</h2>
        <p className="text-sm text-gray-600 mt-2">{flow.description}</p>
        {flow.helper && <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded">{flow.helper}</p>}
      </div>

      {/* Initial fields */}
      {step === "fields" && flow.fields && (
        <div className="space-y-4">
          {flow.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder}
                value={formData[field.key] || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className={`w-full px-3 py-2 border rounded text-sm ${
                  errors[field.key] ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors[field.key] && <p className="text-xs text-red-600 mt-1">{errors[field.key]}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Advanced fields for Pro/Agency */}
      {step === "advanced" && provider.advancedFields && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Optional: Add advanced credentials for enhanced functionality</p>
          {provider.advancedFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder}
                value={formData[field.key] || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              {field.help && <p className="text-xs text-gray-500 mt-1">{field.help}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Complete step */}
      {step === "complete" && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium text-green-800">✓ Connection verified successfully!</p>
          <p className="text-xs text-green-700 mt-1">Check your email for the verification link.</p>
        </div>
      )}

      {/* Error message */}
      {errors._global && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">{errors._global}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        {step !== "complete" && (
          <button
            onClick={step === "advanced" ? handleAdvancedSave : handleNext}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : step === "advanced" ? "Save connection" : flow.ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
