import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTopUpOperatingAmount,
  createFundingIdempotencyKey,
  deriveCapacityStatus,
  failedProviderCharge,
} from "./economy-core.ts";

test("funding keys are stable across webhook retries", () => {
  assert.equal(createFundingIdempotencyKey("mpesa", "plan", "receipt:ABC"), "plan:mpesa:receipt:ABC");
  assert.equal(createFundingIdempotencyKey("mpesa", "plan", "receipt:ABC"), "plan:mpesa:receipt:ABC");
});

test("top-ups preserve a provider and operating reserve", () => {
  assert.equal(calculateTopUpOperatingAmount(100_000), 70_000);
});

test("capacity status is bounded and predictable", () => {
  assert.deepEqual(deriveCapacityStatus(0, 80_000), { remainingPercent: 0, status: "exhausted" });
  assert.deepEqual(deriveCapacityStatus(20_000, 80_000), { remainingPercent: 25, status: "warning" });
  assert.deepEqual(deriveCapacityStatus(90_000, 80_000), { remainingPercent: 100, status: "healthy" });
});

test("a provider that was never called costs zero", () => {
  assert.equal(failedProviderCharge({ paidRail: true, estimatedMinor: 600, errorMessage: "Perplexity is not configured" }), 0);
  assert.equal(failedProviderCharge({ paidRail: true, estimatedMinor: 600, errorMessage: "Provider returned 500" }), 600);
});
