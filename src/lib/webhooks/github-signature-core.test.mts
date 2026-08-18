import test from "node:test";
import assert from "node:assert/strict";
import { computeGithubSignature, verifyGithubSignatureValue } from "./github-signature-core.ts";

// GitHub's own documented example
// (https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries):
// secret "It's a Secret to Everybody", payload "Hello, World!". The
// expected value below was independently confirmed via Node's own
// crypto.createHmac directly (not through this file's implementation)
// before writing this test, then found to match GitHub's published
// example exactly - same verification standard as the Slack signature
// tests, not a self-consistency-only check.
const GITHUB_DOC_SECRET = "It's a Secret to Everybody";
const GITHUB_DOC_PAYLOAD = "Hello, World!";
const GITHUB_DOC_EXPECTED = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";

test("computeGithubSignature matches GitHub's own published example exactly", () => {
  assert.equal(computeGithubSignature(GITHUB_DOC_PAYLOAD, GITHUB_DOC_SECRET), GITHUB_DOC_EXPECTED);
});

test("verifyGithubSignatureValue accepts GitHub's own published example", () => {
  assert.equal(verifyGithubSignatureValue(GITHUB_DOC_EXPECTED, GITHUB_DOC_PAYLOAD, GITHUB_DOC_SECRET), true);
});

test("verifyGithubSignatureValue rejects a tampered body", () => {
  assert.equal(verifyGithubSignatureValue(GITHUB_DOC_EXPECTED, "Hello, World!!", GITHUB_DOC_SECRET), false);
});

test("verifyGithubSignatureValue rejects the wrong secret", () => {
  assert.equal(verifyGithubSignatureValue(GITHUB_DOC_EXPECTED, GITHUB_DOC_PAYLOAD, "wrong secret"), false);
});

test("verifyGithubSignatureValue rejects a signature missing the sha256= prefix", () => {
  assert.equal(verifyGithubSignatureValue("757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17", GITHUB_DOC_PAYLOAD, GITHUB_DOC_SECRET), false);
});
