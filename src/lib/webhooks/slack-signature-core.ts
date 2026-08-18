import { createHmac, timingSafeEqual } from "node:crypto";

// Framework-independent on purpose - no "next/server" import anywhere in
// this file, following the same -core.ts convention as
// security/network-core.ts and billing/economy-core.ts elsewhere in this
// codebase. That's what makes this directly unit-testable with plain
// node:test instead of needing Next's module resolution.

export function computeSlackSignature(timestamp: string, rawBody: string, signingSecret: string) {
  return `v0=${createHmac("sha256", signingSecret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
}

export function isSlackTimestampFresh(timestamp: string, nowSeconds: number = Date.now() / 1000, windowSeconds = 300) {
  const timestampNum = Number(timestamp);
  return Number.isFinite(timestampNum) && Math.abs(nowSeconds - timestampNum) <= windowSeconds;
}

export function safeEqualSlackSignature(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
