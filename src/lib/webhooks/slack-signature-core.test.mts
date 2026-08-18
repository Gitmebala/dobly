import test from "node:test";
import assert from "node:assert/strict";
import { computeSlackSignature, isSlackTimestampFresh } from "./slack-signature-core.ts";

// Slack publishes a canonical worked example in their own docs
// (https://api.slack.com/authentication/verifying-requests-from-slack) -
// using it here instead of a self-consistency check (sign then verify your
// own signature) is a materially stronger test: it confirms this
// implementation is byte-for-byte compatible with Slack's actual signing
// scheme, not just internally consistent with itself.
const SLACK_DOC_SECRET = "8f742231b10e8888abcd99yyyzzz85a5";
const SLACK_DOC_TIMESTAMP = "1531420618";
const SLACK_DOC_BODY =
  "token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&team_domain=testteamnow&channel_id=G8PSS9T3V&channel_name=foobar&user_id=U2CERLKJA&user_name=roadrunner&command=%2Fwebhook-collect&text=&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2FT1DC2JH3J%2F397700885554%2F96rGlfmibIGlgcZRskXaIFfN&trigger_id=398738663015.47445629121.803a0bc887a14d10d2c447fce8b6703c";
const SLACK_DOC_EXPECTED_SIGNATURE = "v0=a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503";

test("computeSlackSignature matches Slack's own published example exactly", () => {
  const signature = computeSlackSignature(SLACK_DOC_TIMESTAMP, SLACK_DOC_BODY, SLACK_DOC_SECRET);
  assert.equal(signature, SLACK_DOC_EXPECTED_SIGNATURE);
});

test("computeSlackSignature changes if the body, timestamp, or secret changes", () => {
  const base = computeSlackSignature(SLACK_DOC_TIMESTAMP, SLACK_DOC_BODY, SLACK_DOC_SECRET);
  assert.notEqual(computeSlackSignature(SLACK_DOC_TIMESTAMP, SLACK_DOC_BODY + "x", SLACK_DOC_SECRET), base);
  assert.notEqual(computeSlackSignature("1531420619", SLACK_DOC_BODY, SLACK_DOC_SECRET), base);
  assert.notEqual(computeSlackSignature(SLACK_DOC_TIMESTAMP, SLACK_DOC_BODY, SLACK_DOC_SECRET + "x"), base);
});

test("isSlackTimestampFresh accepts a timestamp inside the 5-minute window", () => {
  const now = 1531420618;
  assert.equal(isSlackTimestampFresh("1531420618", now), true); // exact
  assert.equal(isSlackTimestampFresh("1531420618", now + 299), true); // just inside
  assert.equal(isSlackTimestampFresh("1531420618", now - 299), true); // just inside, past
});

test("isSlackTimestampFresh rejects a timestamp outside the 5-minute window (replay protection)", () => {
  const now = 1531420618;
  assert.equal(isSlackTimestampFresh("1531420618", now + 301), false);
  assert.equal(isSlackTimestampFresh("1531420618", now - 301), false);
});

test("isSlackTimestampFresh rejects a non-numeric timestamp", () => {
  assert.equal(isSlackTimestampFresh("not-a-number"), false);
});
