import test from "node:test";
import assert from "node:assert/strict";
import {
  inferBoardDirectiveMemory,
  inferImplicitHandoffBranches,
  inferImplicitHandoffRoute,
  nextHandoffDepartment,
} from "./coordination-logic.ts";

test("support refund work branches into operations and finance", () => {
  const branches = inferImplicitHandoffBranches({
    currentDepartmentId: "support",
    sourceRecordKind: "support_case",
    summary: "Customer asked for a refund and billing reversal after a delivery failure.",
  });

  assert.deepEqual(
    branches.map((branch) => branch.label),
    ["service_recovery", "financial_review"],
  );
  assert.deepEqual(branches[0]?.route, ["support", "operations"]);
  assert.deepEqual(branches[1]?.route, ["support", "finance"]);
});

test("marketing content work can fan out into sales and analytics", () => {
  const branches = inferImplicitHandoffBranches({
    currentDepartmentId: "marketing",
    sourceRecordKind: "content_item",
    summary: "Launch content is approved and ready for measurement.",
  });

  assert.deepEqual(
    branches.map((branch) => branch.route),
    [
      ["marketing", "sales"],
      ["marketing", "analytics"],
    ],
  );
});

test("next handoff respects explicit branch route stage positions", () => {
  const routed = nextHandoffDepartment({
    route: ["support", "finance", "general_manager"],
    currentDepartmentId: "finance",
    currentIndex: 1,
  });

  assert.equal(routed.nextDepartmentId, "general_manager");
  assert.equal(routed.isFinal, false);
});

test("directive memory infers escalation policy for governance-heavy guidance", () => {
  const directive = inferBoardDirectiveMemory({
    title: "Escalate sensitive customer compensation",
    summary: "Trust risk is rising because ad hoc credits are being promised.",
    recommendedAction: "Any refund, credit, or public apology above a low threshold must stop for owner approval first.",
    departmentIds: ["support", "general_manager"],
  });

  assert.equal(directive.kind, "escalation_rule");
  assert.equal(directive.scope, "support");
  assert.ok(directive.tags.includes("leadership"));
});

test("implicit routes still exist for narrower single-lane operational flows", () => {
  assert.deepEqual(
    inferImplicitHandoffRoute({
      currentDepartmentId: "reception",
      sourceRecordKind: "lead",
    }),
    ["reception", "sales"],
  );
});
