import "server-only";

import type { WorkflowActionStep } from "@/types";
import type { BillableCapability } from "@/lib/billing/cost-catalog";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";

export interface ConnectorCostEstimate {
  capability: BillableCapability;
  provider: string;
  estimatedMinor: number;
  paidRail: boolean;
  unit: string;
}

function executorProvider(executorId: string) {
  const parts = executorId.toLowerCase().split(".");
  if (parts[0] === "native" || parts[0] === "generic") return parts[1] || parts[0];
  return parts[0] || "connected_customer";
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function estimateConnectorCost(input: {
  executorId: string;
  step: Pick<WorkflowActionStep, "app" | "actionType" | "connectorActionId" | "config">;
}): ConnectorCostEstimate {
  const provider = executorProvider(input.executorId);
  const action = `${input.executorId} ${input.step.app} ${input.step.actionType} ${input.step.connectorActionId ?? ""}`.toLowerCase();
  if (provider === "orchestrator") {
    return process.env.ANTHROPIC_API_KEY
      ? { capability: "ai.reasoning", provider: "anthropic", estimatedMinor: 350, paidRail: true, unit: "generation" }
      : { capability: "document.process", provider: "dobly_documents", estimatedMinor: 10, paidRail: false, unit: "document" };
  }
  if (provider === "whatsapp") return { capability: "whatsapp.send", provider: "meta", estimatedMinor: 300, paidRail: true, unit: "conversation" };
  if (hasAny(action, ["sms", "text_message"])) return { capability: "sms.send", provider: "kenya_sms", estimatedMinor: 150, paidRail: true, unit: "message" };
  if (hasAny(action, ["voice", "call", "phone"])) {
    const minutes = Math.max(1, Number(input.step.config.durationMinutes ?? input.step.config.minutes ?? 1));
    return { capability: "voice.minute", provider: "africas_talking", estimatedMinor: Math.ceil(minutes * 1_500), paidRail: true, unit: "minute" };
  }
  if (hasAny(action, ["gmail", "send_email", "generic.email"])) {
    const connected = provider === "google";
    return { capability: "email.send", provider: connected ? "google" : "resend", estimatedMinor: connected ? 0 : 10, paidRail: !connected, unit: "message" };
  }
  if (hasAny(action, ["mpesa", "paystack", "stripe", "payment", "refund", "invoice"])) {
    return { capability: "payment.collect", provider, estimatedMinor: 5, paidRail: false, unit: "action" };
  }
  if (hasAny(action, ["get_", "read_", "list_", "status", "analyze", "responses", "events"])) {
    return { capability: "software.read", provider: "connected_customer", estimatedMinor: 0, paidRail: false, unit: "action" };
  }
  return { capability: "software.write", provider: "connected_customer", estimatedMinor: 5, paidRail: false, unit: "action" };
}

function providerRequestId(result: object) {
  const record = result as Record<string, unknown>;
  const candidate = record.providerRequestId ?? record.requestId ?? record.messageId ?? record.sid ?? record.id;
  return typeof candidate === "string" ? candidate : null;
}

export async function executeMeteredConnector<T extends object>(input: {
  userId: string;
  workspaceId?: string | null;
  runId: string;
  step: WorkflowActionStep;
  executorId: string;
  approvedCost?: boolean;
  execute: () => Promise<T>;
}) {
  const estimate = estimateConnectorCost({ executorId: input.executorId, step: input.step });
  const reservation = await reserveOperatingCapacity({
    userId: input.userId,
    workspaceId: input.workspaceId,
    capability: estimate.capability,
    provider: estimate.provider,
    estimatedMinor: estimate.estimatedMinor,
    idempotencyKey: `connector:${input.runId}:${input.step.id}:${input.executorId}`,
    runId: input.runId,
    metadata: {
      executorId: input.executorId,
      stepId: input.step.id,
      app: input.step.app,
      approvedCost: Boolean(input.approvedCost),
      unit: estimate.unit,
    },
  });
  try {
    const result = await input.execute();
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimate.estimatedMinor,
      status: "succeeded",
      providerRequestId: providerRequestId(result),
      metadata: { executorId: input.executorId, stepId: input.step.id },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connector execution failed.";
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: failedProviderCharge({ paidRail: estimate.paidRail, estimatedMinor: estimate.estimatedMinor, errorMessage: message }),
      status: "failed",
      metadata: { executorId: input.executorId, stepId: input.step.id, error: message },
    }).catch(() => undefined);
    throw error;
  }
}
