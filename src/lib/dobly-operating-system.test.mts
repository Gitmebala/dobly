import test from "node:test";
import assert from "node:assert/strict";
import { buildDoblyOperatingSpec } from "./dobly-operating-system.ts";

test("high-agency engineering missions become a full operating loop", () => {
  const spec = buildDoblyOperatingSpec({
    prompt: "Research the best auth architecture, implement it, write tests, and open the GitHub PR.",
    availability: { softwareTools: { github_repo_ops: true }, runtimes: { research: true } },
  });

  assert.equal(spec.archetypeId, "engineering_delivery");
  assert.equal(spec.operatorShape.suggestedName, "Engineering Operator");
  assert.equal(spec.autonomy.codeChangesNeedReview, true);
  assert.ok(spec.phases.some((phase) => phase.id === "research"));
  assert.ok(spec.phases.some((phase) => phase.id === "act"));
  assert.ok(spec.phases.some((phase) => phase.id === "handoff"));
  assert.ok(spec.deliverables.includes("reviewable code/change package"));
});

test("continuous business missions become watchtower operating mode without hardcoded examples", () => {
  const spec = buildDoblyOperatingSpec({
    prompt: "Continuously monitor the business, detect supplier delays and service pressure, and route only meaningful issues to the owner.",
    availability: { runtimes: { research: true } },
  });

  assert.equal(spec.operatingMode, "watchtower");
  assert.equal(spec.operatorShape.loopCadence, "always_on");
  assert.equal(spec.watchPolicy.shouldKeepWatching, true);
  assert.ok(spec.watchPolicy.signals.includes("supplier delays"));
  assert.ok(spec.phases.some((phase) => phase.id === "watch"));
  assert.ok(spec.deliverables.includes("watch rule and escalation criteria"));
});

test("reception missions keep customer-facing action approval-aware", () => {
  const spec = buildDoblyOperatingSpec({
    prompt: "Answer inbound calls, qualify leads, book appointments, and hand off urgent cases to a human.",
    availability: { softwareTools: { browser_software_ops: true } },
  });

  assert.equal(spec.archetypeId, "reception_and_conversation");
  assert.equal(spec.operatorShape.departmentId, "reception");
  assert.equal(spec.autonomy.externalActionsNeedApproval, true);
  assert.ok(spec.watchPolicy.signals.includes("booking requests"));
  assert.ok(spec.deliverables.includes("customer-ready message or conversation plan"));
});
