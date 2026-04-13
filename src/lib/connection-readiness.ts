import type { Connection } from "@/types";

export interface ConnectionReadiness {
  operational: boolean;
  label: string;
  detail?: string;
  tone: "ready" | "warning" | "danger" | "muted";
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function getConnectionReadiness(connection: Connection): ConnectionReadiness {
  if (connection.status === "expired") {
    return {
      operational: false,
      label: "Needs reconnection",
      detail: "The saved credentials or authorization expired.",
      tone: "warning",
    };
  }

  if (connection.status === "error") {
    return {
      operational: false,
      label: "Setup issue",
      detail: "Dobly could not validate or use this connection.",
      tone: "danger",
    };
  }

  if (connection.provider === "whatsapp") {
    const verified = hasText(connection.metadata?.verified_at);
    const phoneNumberId = hasText(connection.metadata?.phoneNumberId);

    if (connection.status === "active" && phoneNumberId) {
      return {
        operational: true,
        label: "Ready",
        detail: "Outbound WhatsApp messaging is configured.",
        tone: "ready",
      };
    }

    if (verified) {
      return {
        operational: false,
        label: "Finish messaging setup",
        detail:
          "The number is verified, but Dobly still needs the messaging setup before it can send WhatsApp messages.",
        tone: "warning",
      };
    }

    return {
      operational: false,
      label: "Verification pending",
      detail: "Verify the number first before Dobly can finish WhatsApp setup.",
      tone: "muted",
    };
  }

  if (connection.provider === "mpesa") {
    const callbackUrl = hasText(connection.metadata?.callbackUrl);
    const environment = hasText(connection.metadata?.environment);

    if (connection.status === "active" && callbackUrl && environment) {
      return {
        operational: true,
        label: "Ready",
        detail: "Daraja credentials and callback routing are in place.",
        tone: "ready",
      };
    }

    return {
      operational: false,
      label: "Finish Daraja setup",
      detail: "Dobly needs a callback URL and environment before M-PESA flows can run.",
      tone: "warning",
    };
  }

  if (connection.status === "active") {
    return {
      operational: true,
      label: "Ready",
      detail: "This connection is ready for live workflows.",
      tone: "ready",
    };
  }

  return {
    operational: false,
    label: "Setup pending",
    detail: "Finish the connection flow before Dobly can use this account.",
    tone: "muted",
  };
}

export function isConnectionOperational(connection: Connection) {
  return getConnectionReadiness(connection).operational;
}

export function findOperationalConnection(
  connections: Connection[],
  provider: string
) {
  return connections.find(
    (connection) =>
      connection.provider === provider && isConnectionOperational(connection)
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
