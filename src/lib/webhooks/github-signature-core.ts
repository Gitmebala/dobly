import { createHmac, timingSafeEqual } from "node:crypto";

// Framework-independent, same -core.ts convention as slack-signature-core.ts
// (and security/network-core.ts, billing/economy-core.ts elsewhere in this
// codebase) - no "next/server" import, so this is directly unit-testable
// with plain node:test.
//
// GitHub's scheme (https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries):
// HMAC-SHA256 over the raw request body, using the secret the REPO OWNER
// chose and pasted into their own GitHub webhook settings - unlike Slack,
// there's no platform-wide app signing secret to wait on here, which is
// why this trigger kind is usable immediately (see loop-triggers.ts's
// github_repo comment). Header format: "sha256=<hex>".

export function computeGithubSignature(rawBody: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

export function verifyGithubSignatureValue(providedSignature: string, rawBody: string, secret: string) {
  if (!providedSignature.startsWith("sha256=")) return false;
  const expected = computeGithubSignature(rawBody, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}
