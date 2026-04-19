import { getDecryptedConnectionSecrets } from "@/lib/connections";
import { logConnectionAudit } from "@/lib/connection-audit";

/**
 * Rate limiter for credential access to prevent abuse
 */
class CredentialRateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();
  private readonly maxAttempts = 100;
  private readonly windowMs = 60 * 1000; // 1 minute

  isAllowed(key: string): boolean {
    const now = Date.now();
    const existing = this.attempts.get(key);

    if (!existing || now > existing.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (existing.count < this.maxAttempts) {
      existing.count++;
      return true;
    }

    return false;
  }

  getRemainingAttempts(key: string): number {
    const existing = this.attempts.get(key);
    if (!existing || Date.now() > existing.resetTime) return this.maxAttempts;
    return Math.max(0, this.maxAttempts - existing.count);
  }
}

const rateLimiter = new CredentialRateLimiter();

/**
 * Secure credential accessor with rate limiting and audit logging
 */
export async function getSecureConnectionCredentials(
  userId: string,
  connectionId: string,
  context?: {
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const accessKey = `${userId}:${connectionId}`;

  // Check rate limit
  if (!rateLimiter.isAllowed(accessKey)) {
    await logConnectionAudit({
      userId,
      connectionId,
      action: "credential_accessed",
      status: "failure",
      errorMessage: "Rate limit exceeded",
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
    throw new Error("Too many credential access attempts. Please try again later.");
  }

  try {
    const credentials = await getDecryptedConnectionSecrets(connectionId);

    await logConnectionAudit({
      userId,
      connectionId,
      action: "credential_accessed",
      status: "success",
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: {
        hasAccessToken: !!credentials.accessToken,
        hasRefreshToken: !!credentials.refreshToken,
        hasSecret: !!credentials.secret,
      },
    });

    return credentials;
  } catch (error) {
    await logConnectionAudit({
      userId,
      connectionId,
      action: "credential_accessed",
      status: "failure",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
    throw error;
  }
}

/**
 * Get remaining credential access attempts
 */
export function getRemainingCredentialAttempts(userId: string, connectionId: string): number {
  const accessKey = `${userId}:${connectionId}`;
  return rateLimiter.getRemainingAttempts(accessKey);
}

/**
 * Validate credential expiry and trigger refresh if needed
 */
export async function validateCredentialExpiry(
  credentials: Awaited<ReturnType<typeof getDecryptedConnectionSecrets>>
): Promise<{
  isValid: boolean;
  expiresIn?: number; // milliseconds
  needsRefresh: boolean;
}> {
  if (!credentials.expiresAt) {
    return { isValid: true, needsRefresh: false };
  }

  const expiryTime = new Date(credentials.expiresAt).getTime();
  const now = Date.now();
  const expiresIn = expiryTime - now;

  // Flag for refresh if expires within 5 minutes
  const needsRefresh = expiresIn < 5 * 60 * 1000;

  return {
    isValid: expiresIn > 0,
    expiresIn: Math.max(0, expiresIn),
    needsRefresh,
  };
}

/**
 * Generate a time-limited credential token for safe cross-service communication
 * (not used in DB, only for secure inter-process communication)
 */
export function generateCredentialAccessToken(
  userId: string,
  connectionId: string,
  expiryMinutes: number = 30
): string {
  const payload = {
    userId,
    connectionId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + expiryMinutes * 60 * 1000,
  };

  // In production, sign this with a private key
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Verify a credential access token
 */
export function verifyCredentialAccessToken(token: string): {
  valid: boolean;
  payload?: { userId: string; connectionId: string; issuedAt: number; expiresAt: number };
  error?: string;
} {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8"));

    if (payload.expiresAt < Date.now()) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: "Invalid token" };
  }
}
