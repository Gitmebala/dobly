import test from "node:test";
import assert from "node:assert/strict";
import { generateOutcomeContract } from "../outcome-contracts-core.ts";
import { scoreArtifactAgainstContract } from "./artifact-quality-core.ts";
import { compareArtifactToReferenceExamples, decideArtifactRelease } from "./release-gate.ts";

test("artifact scorer flags thin generic output for revision", () => {
  const contract = generateOutcomeContract({
    entityType: "runtime_command",
    entityId: "run-1",
    name: "Launch Brief",
    mission: "Create a launch brief and creative package for a new product launch.",
    outcome: "A complete launch package with clear audience, angle, assets, and approval readiness.",
    prompt: "Create a launch brief, campaign brief, and launch video plan for the product launch.",
  });

  const review = scoreArtifactAgainstContract({
    contract,
    title: "Launch Brief",
    kind: "document",
    content: {
      summary: "Generic launch brief.",
      text: "Help the user with various launch ideas and some next steps.",
    },
    intent: contract.intent,
  });

  assert.equal(review.status, "needs_revision");
  assert.ok(review.revisionPlan.length > 0);
});

test("artifact scorer approves richer execution-ready output", () => {
  const contract = generateOutcomeContract({
    entityType: "runtime_command",
    entityId: "run-2",
    name: "Engineering Handoff",
    mission: "Prepare an execution-ready engineering handoff and issue package.",
    outcome: "An engineering-ready handoff with owners, blockers, release risk, and next actions.",
    prompt: "Create the engineering issue package, release brief, and handoff tasks.",
  });

  const review = scoreArtifactAgainstContract({
    contract,
    title: "Engineering Handoff",
    kind: "code_context_package",
    content: {
      owner: "Platform Team",
      blockers: ["Pending schema migration", "OAuth callback regression in staging"],
      nextSteps: [
        "Merge migration PR after approvals",
        "Run staging callback smoke test",
        "Publish release note and rollback checklist",
      ],
      releaseRisk: "Medium until the callback regression is verified in staging.",
      checklist: ["Owner assigned", "Dependencies listed", "Rollback path documented"],
      proof: "Issue package and release brief prepared for review.",
    },
    intent: contract.intent,
  });

  assert.equal(review.status, "approved");
  assert.ok(review.overallScore >= 0.82);
});

test("release gate revises drafts that resemble rejected examples", () => {
  const contract = generateOutcomeContract({
    entityType: "runtime_command",
    entityId: "run-3",
    name: "Customer Reply",
    mission: "Prepare a customer follow-up that resolves the issue and makes the next step obvious.",
    outcome: "A ready-to-send reply grounded in the actual customer context.",
    prompt: "Draft the reply for a delayed order and next delivery step.",
  });

  const review = scoreArtifactAgainstContract({
    contract,
    title: "Customer Reply",
    kind: "message",
    content: {
      text: "I hope this message finds you well. Additionally, please let me know if you have any questions.",
    },
    intent: contract.intent,
  });

  const comparison = compareArtifactToReferenceExamples({
    content: {
      text: "I hope this message finds you well. Additionally, please let me know if you have any questions.",
    },
    references: {
      gold: null,
      acceptable: {
        id: "acceptable-1",
        user_id: "user-1",
        workspace_id: null,
        operator_id: null,
        lane_id: "message_output",
        artifact_kind: "message",
        quality_level: "acceptable",
        title: "Acceptable delay reply",
        content: {
          text: "Your order is delayed by two days. The new delivery date is Friday, and we will send the tracking update tonight.",
        },
        rationale: "Concrete delay explanation and next step.",
        tags: [],
        source_artifact_id: null,
        source_feedback_id: null,
        created_at: "",
        updated_at: "",
      },
      rejected: {
        id: "rejected-1",
        user_id: "user-1",
        workspace_id: null,
        operator_id: null,
        lane_id: "message_output",
        artifact_kind: "message",
        quality_level: "rejected",
        title: "Weak AI reply",
        content: {
          text: "I hope this message finds you well. Additionally, we value your patience and support during this time.",
        },
        rationale: "Generic filler and no concrete action.",
        tags: [],
        source_artifact_id: null,
        source_feedback_id: null,
        created_at: "",
        updated_at: "",
      },
      all: [],
    },
  });

  const release = decideArtifactRelease({
    title: "Customer Reply",
    task: "Reply to the delayed order customer.",
    kind: "message",
    intent: contract.intent,
    contract,
    review,
    comparison,
  });

  assert.equal(release.decision, "block");
  assert.equal(release.packet.reviewState, "blocked");
});
