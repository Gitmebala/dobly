import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  checkGuardrail,
  enforceGuardrails,
  normaliseRules,
} from "./guardrail-enforcement.ts";

describe("guardrail enforcement", () => {
  it("stops an action that exceeds a money ceiling", () => {
    const reason = checkGuardrail("never refund over $50", "refund $120 to Dana for the late order");
    assert.ok(reason, "a $120 refund must trip a $50 refund limit");
    assert.match(reason!, /120/);
  });

  it("allows an action under the ceiling", () => {
    const reason = checkGuardrail("never refund over $50", "refund $20 to Dana");
    assert.equal(reason, null);
  });

  it("compares amounts numerically, not as strings", () => {
    // "9" sorts above "50" as a string; numerically it is below.
    assert.equal(checkGuardrail("never refund over $50", "refund $9 to Sam"), null);
    assert.ok(checkGuardrail("never refund over $9", "refund $50 to Sam"));
  });

  it("handles thousands separators and currency words", () => {
    assert.ok(checkGuardrail("never pay over $1,000", "pay 2,500 usd to the supplier"));
    assert.equal(checkGuardrail("never pay over $1,000", "pay 250 usd to the supplier"), null);
  });

  it("trips a forbidding rule that shares a verb and a topic", () => {
    const reason = checkGuardrail(
      "never email customers on weekends",
      "email customers the Saturday promotion",
    );
    assert.ok(reason, "sharing verb 'email' and topic 'customers' must trip");
  });

  it("ignores rules unrelated to the action", () => {
    assert.equal(
      checkGuardrail("never refund over $50", "draft a summary of this week's support tickets"),
      null,
    );
  });

  it("ignores permissive rules", () => {
    assert.equal(checkGuardrail("always be polite to customers", "email customers an update"), null);
  });

  it("allows when there are no guardrails", () => {
    const verdict = enforceGuardrails([], "send the invoice");
    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.tripped, []);
  });

  it("reports every rule that trips, in the owner's words", () => {
    const verdict = enforceGuardrails(
      ["never refund over $50", "never delete customer records"],
      "refund $200 and delete the customer record",
    );
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.tripped.length, 2);
    assert.ok(verdict.reasons.every((reason) => reason.length > 0));
  });

  it("holds the run when a rule cannot be evaluated, never allows it", () => {
    // A rule object that throws when coerced must not be read as permission.
    const hostile = {
      toString() {
        throw new Error("unreadable rule");
      },
    };
    const verdict = enforceGuardrails([hostile], "send money to an unknown account");
    assert.equal(verdict.allowed, false, "an unevaluable rule must stop the run");
  });

  it("accepts guardrails as array, string, or wrapped object", () => {
    assert.deepEqual(normaliseRules(["a", "b"]), ["a", "b"]);
    assert.deepEqual(normaliseRules("first rule\nsecond rule"), ["first rule", "second rule"]);
    assert.deepEqual(normaliseRules({ rules: ["wrapped"] }), ["wrapped"]);
    assert.deepEqual(normaliseRules(null), []);
    assert.deepEqual(normaliseRules(undefined), []);
  });

  it("drops blank rules rather than treating them as blockers", () => {
    assert.deepEqual(normaliseRules(["  ", "real rule", ""]), ["real rule"]);
  });
});
