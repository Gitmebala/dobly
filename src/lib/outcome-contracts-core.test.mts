import test from "node:test";
import assert from "node:assert/strict";
import {
  critiqueOutcomeContract,
  generateOutcomeContract,
  improveOutcomeContract,
} from "./outcome-contracts-core.ts";

test("marketing operator contracts become approval-aware and non-generic", () => {
  const contract = generateOutcomeContract({
    entityType: "operator",
    entityId: "op-1",
    name: "Launch Operator",
    mission: "Plan and produce a product launch campaign across content, visuals, and publishing.",
    outcome: "A full launch system with assets, approvals, and channel-specific deliverables.",
    prompt: "Turn our product notes into a launch brief, presentation deck, social assets, and a launch video.",
    capabilityTags: ["generate_media", "create_document"],
    tools: ["creative_media_ops", "document_production", "social_publishing_ops"],
    approvalMode: "approve_risky",
  });

  assert.equal(contract.intent.departmentId, "marketing");
  assert.equal(contract.intent.outputTypeId, "video");
  assert.ok(contract.requiredArtifacts.some((artifact) => artifact.kind === "brief"));
  assert.ok(contract.unacceptableOutcomes.some((line) => /generic/i.test(line)));
  assert.ok(contract.critique.overallScore >= 0.82);
});

test("engineering contracts require execution-ready context", () => {
  const contract = generateOutcomeContract({
    entityType: "operator",
    entityId: "op-2",
    name: "Release Operator",
    mission: "Coordinate release notes, engineering handoff, and issue packaging.",
    outcome: "An engineering-ready release package that clearly assigns next actions.",
    prompt: "Prepare a release summary, issue package, and engineering handoff for the next deploy.",
    capabilityTags: ["edit_codebase", "create_document"],
    tools: ["github_repo_ops", "document_production"],
    approvalMode: "supervised",
  });

  assert.equal(contract.intent.departmentId, "engineering_product");
  assert.equal(contract.intent.outputTypeId, "code_context_package");
  assert.ok(contract.successCriteria.some((line) => /ownership-ready|next action/i.test(line)));
});

test("improvement pass raises weak contracts", () => {
  const draft = generateOutcomeContract({
    entityType: "runtime_command",
    name: "Quick Task",
    mission: "Help with something.",
    prompt: "Do it.",
  });

  const improved = improveOutcomeContract(draft);
  const critique = critiqueOutcomeContract(improved);

  assert.ok(improved.verificationChecklist.length >= draft.verificationChecklist.length);
  assert.ok(critique.overallScore >= draft.critique.overallScore);
});
