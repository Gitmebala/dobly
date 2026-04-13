import type { Connection } from "@/types";

export function getConnectionReadinessIssue(connection: Connection) {
  if (connection.status !== "active") {
    return "Connection is not active yet.";
  }

  if (connection.provider === "whatsapp") {
    const phoneNumberId = String(connection.metadata?.phoneNumberId ?? "").trim();
    if (!phoneNumberId) {
      return "WhatsApp number is verified, but messaging setup is not finished yet.";
    }
  }

  if (connection.provider === "mpesa") {
    const callbackUrl = String(connection.metadata?.callbackUrl ?? "").trim();
    const environment = String(connection.metadata?.environment ?? "").trim();
    if (!callbackUrl || !environment) {
      return "M-PESA setup is missing callback or environment details.";
    }
  }

  return null;
}

export function isConnectionOperational(connection: Connection) {
  return getConnectionReadinessIssue(connection) === null;
}
