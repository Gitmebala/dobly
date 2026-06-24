import type { Connection } from "@/types";
import {
  getConnectionCapabilityProfile,
  normalizeConnectionProviderId,
  type ConnectionCostMode,
  type ConnectionServiceCapability,
  type ConnectionSupportLevel,
} from "@/lib/connection-capabilities";

export interface ConnectionReadiness {
  operational: boolean;
  label: string;
  detail?: string;
  tone: "ready" | "warning" | "danger" | "muted";
  supportLevel?: ConnectionSupportLevel;
  services?: ConnectionServiceCapability[];
  serviceLabels?: string[];
  costModes?: ConnectionCostMode[];
  readinessHints?: string[];
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function withCapabilityProfile(connection: Connection, readiness: ConnectionReadiness): ConnectionReadiness {
  const profile = getConnectionCapabilityProfile(connection.provider);
  if (!profile) return readiness;
  return {
    ...readiness,
    supportLevel: profile.supportLevel,
    services: profile.services,
    serviceLabels: profile.services.map((service) => service.label),
    costModes: Array.from(new Set(profile.services.map((service) => service.costMode))),
    readinessHints: profile.readinessHints,
  };
}

export function getConnectionReadiness(connection: Connection): ConnectionReadiness {
  if (connection.status === "expired") {
    return withCapabilityProfile(connection, {
      operational: false,
      label: "Needs reconnection",
      detail: "The saved credentials or authorization expired.",
      tone: "warning",
    });
  }

  if (connection.status === "error") {
    return withCapabilityProfile(connection, {
      operational: false,
      label: "Setup issue",
      detail: "Dobly could not validate or use this connection.",
      tone: "danger",
    });
  }

  if (normalizeConnectionProviderId(connection.provider) === "whatsapp") {
    const verified = hasText(connection.metadata?.verified_at);
    const phoneNumberId = hasText(connection.metadata?.phoneNumberId);

    if (connection.status === "active" && phoneNumberId) {
      return withCapabilityProfile(connection, {
        operational: true,
        label: "Ready",
        detail: "Outbound WhatsApp messaging is configured.",
        tone: "ready",
      });
    }

    if (verified) {
      return withCapabilityProfile(connection, {
        operational: false,
        label: "Finish messaging setup",
        detail:
          "The number is verified, but Dobly still needs the messaging setup before it can send WhatsApp messages.",
        tone: "warning",
      });
    }

    return withCapabilityProfile(connection, {
      operational: false,
      label: "Verification pending",
      detail: "Verify the number first before Dobly can finish WhatsApp setup.",
      tone: "muted",
    });
  }

  if (normalizeConnectionProviderId(connection.provider) === "mpesa") {
    const callbackUrl = hasText(connection.metadata?.callbackUrl);
    const environment = hasText(connection.metadata?.environment);

    if (connection.status === "active" && callbackUrl && environment) {
      return withCapabilityProfile(connection, {
        operational: true,
        label: "Ready",
        detail: "Daraja credentials and callback routing are in place.",
        tone: "ready",
      });
    }

    return withCapabilityProfile(connection, {
      operational: false,
      label: "Finish Daraja setup",
      detail: "Dobly needs a callback URL and environment before M-PESA flows can run.",
      tone: "warning",
    });
  }

  if (connection.status === "active") {
    const profile = getConnectionCapabilityProfile(connection.provider);
    return withCapabilityProfile(connection, {
      operational: true,
      label: "Ready",
      detail: profile
        ? `Ready for ${profile.services.slice(0, 3).map((service) => service.label.toLowerCase()).join(", ")}.`
        : "This connection is ready for live workflows.",
      tone: "ready",
    });
  }

  return withCapabilityProfile(connection, {
    operational: false,
    label: "Setup pending",
    detail: "Finish the connection flow before Dobly can use this account.",
    tone: "muted",
  });
}

export function isConnectionOperational(connection: Connection) {
  return getConnectionReadiness(connection).operational;
}

export function findOperationalConnection(
  connections: Connection[],
  provider: string
) {
  const normalizedProvider = normalizeConnectionProviderId(provider);
  return connections.find(
    (connection) =>
      normalizeConnectionProviderId(connection.provider) === normalizedProvider && isConnectionOperational(connection)
  );
}

export function describeProviderReadinessIssue(
  connections: Connection[],
  provider: string
) {
  const latest = connections.find((connection) => connection.provider === provider);
  if (!latest) {
    return `No ${provider} connection is set up yet.`;
  }

  const readiness = getConnectionReadiness(latest);
  return readiness.detail ?? `${provider} is not ready yet.`;
}
