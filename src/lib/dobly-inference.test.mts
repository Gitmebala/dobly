import test from "node:test";
import assert from "node:assert/strict";
import {
  attachDoblyIntentMetadata,
  getDepartmentExecutionPack,
  inferDoblyExecutionIntent,
} from "./dobly-inference.ts";
import { inferBoardDirectiveMemory, inferImplicitHandoffRoute, nextHandoffDepartment } from "./office/coordination-logic.ts";

test("marketing media request maps to marketing create video with approval-aware trust", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Create a campaign video and publish it to Instagram for our new offer",
    availability: { runtimes: { media: true, publishing: true } },
  });

  assert.equal(intent.departmentId, "marketing");
  assert.equal(intent.workTypeId, "create");
  assert.equal(intent.outputTypeId, "video");
  assert.equal(intent.trustLevelId, "approval_required");
  assert.equal(intent.route, "media");
});

test("engineering release request maps to build and code context packaging", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Summarize the release, package the GitHub issues, and prepare a code handoff for engineering",
    availability: { softwareTools: { github_repo_ops: true } },
  });

  assert.equal(intent.departmentId, "engineering_product");
  assert.equal(intent.workTypeId, "build");
  assert.equal(intent.outputTypeId, "code_context_package");
  assert.equal(intent.preferredToolId, "github_repo_ops");
});

test("presentation requests map to first-class deck output", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Turn this research into a slide deck presentation for the board meeting",
    availability: { softwareTools: { document_production: true } },
  });

  assert.equal(intent.outputTypeId, "presentation");
  assert.equal(intent.route, "software_execution");
  assert.equal(intent.preferredToolId, "document_production");
});

test("finance execution defaults to human-only and approval-oriented handling", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Create an invoice reminder and collect payment for an overdue client",
    availability: { softwareTools: { finance_backoffice_ops: true } },
  });

  assert.equal(intent.departmentId, "finance");
  assert.equal(intent.trustLevelId, "human_only");
  assert.equal(intent.route, "approval_only");
});

test("research request keeps decision support in assisted brief form", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Research the top competitors and prepare a decision brief for leadership",
    availability: { runtimes: { research: true } },
  });

  assert.equal(intent.workTypeId, "research");
  assert.equal(intent.outputTypeId, "brief");
  assert.equal(intent.capabilityState, "live");
});

test("sales follow-up stays planned until the live crm route exists", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Follow up every new lead by email and move them through the pipeline",
    availability: { softwareTools: { crm_sales_ops: false } },
  });

  assert.equal(intent.departmentId, "sales");
  assert.equal(intent.workTypeId, "communicate");
  assert.equal(intent.outputTypeId, "message");
  assert.equal(intent.route, "software_execution");
  assert.equal(intent.capabilityState, "planned");
});

test("operations scheduling defaults to safer auto-run internal coordination", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Schedule supplier follow-ups and route fulfillment blockers to operations",
  });

  assert.equal(intent.departmentId, "operations");
  assert.equal(intent.workTypeId, "coordinate");
  assert.equal(intent.outputTypeId, "task");
  assert.equal(intent.trustLevelId, "safe_auto_run");
});

test("support complaints keep customer-facing work approval aware", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Reply to the customer complaint, summarize the issue, and escalate it to support leadership",
    availability: { softwareTools: { browser_software_ops: true } },
  });

  assert.equal(intent.departmentId, "support");
  assert.equal(intent.workTypeId, "communicate");
  assert.equal(intent.route, "software_execution");
  assert.equal(intent.trustLevelId, "approval_required");
});

test("cad design requests map to engineering-product artifact work", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Create a CAD design prototype and 3D render package for this product concept",
  });

  assert.equal(intent.departmentId, "engineering_product");
  assert.equal(intent.workTypeId, "create");
  assert.equal(intent.outputTypeId, "image_design");
  assert.equal(intent.executionLaneId, "artifact_pipeline");
});

test("website chatbot requests map to reception communication work", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Create an AI chatbot for my website that answers customer questions and escalates bookings",
    availability: { softwareTools: { browser_software_ops: true } },
  });

  assert.equal(intent.departmentId, "reception");
  assert.equal(intent.workTypeId, "communicate");
  assert.equal(intent.outputTypeId, "message");
  assert.equal(intent.route, "software_execution");
});

test("summarizer requests stay in research/brief territory", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Summarize this long transcript into a sharp executive brief with the key decisions and risks",
    availability: { runtimes: { research: true } },
  });

  assert.equal(intent.workTypeId, "research");
  assert.equal(intent.outputTypeId, "brief");
  assert.equal(intent.capabilityState, "live");
});

test("intent metadata attaches cleanly to persisted records", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Prepare a product handoff deck and engineering issue package",
    availability: { softwareTools: { github_repo_ops: true } },
  });

  const metadata = attachDoblyIntentMetadata({ source: "unit-test" }, intent);

  assert.equal(metadata.source, "unit-test");
  assert.deepEqual(metadata.doblyIntent, intent);
});

test("department packs expose deeper marketing and engineering execution surfaces", () => {
  const marketing = getDepartmentExecutionPack("marketing");
  const engineering = getDepartmentExecutionPack("engineering_product");

  assert.ok(marketing.outputs.includes("videos"));
  assert.ok(engineering.outputs.includes("code context bundles"));
  assert.ok(engineering.standards[0]?.includes("handoff"));
});

test("handoff routing advances to the next department in the coordination route", () => {
  const next = nextHandoffDepartment({
    route: ["marketing", "sales", "projects"],
    currentDepartmentId: "sales",
  });

  assert.equal(next.currentIndex, 1);
  assert.equal(next.nextDepartmentId, "projects");
  assert.equal(next.isFinal, false);
});

test("board directives become durable rule memory when they sound policy-like", () => {
  const memory = inferBoardDirectiveMemory({
    title: "Tighten overdue invoice handling",
    summary: "Collections are slipping and owner trust is dropping.",
    recommendedAction: "Any invoice above 14 days overdue must escalate through Finance before more delivery work continues.",
    departmentIds: ["finance", "operations"],
  });

  assert.equal(memory.kind, "escalation_rule");
  assert.equal(memory.scope, "finance");
  assert.ok(memory.tags.includes("board-directive"));
  assert.match(memory.body, /Preferred handling/i);
});

test("implicit handoff routes cover content and operations downstream flows", () => {
  assert.deepEqual(inferImplicitHandoffRoute({ currentDepartmentId: "marketing", sourceRecordKind: "content_item" }), [
    "marketing",
    "sales",
  ]);
  assert.deepEqual(inferImplicitHandoffRoute({ currentDepartmentId: "operations", sourceRecordKind: "operations_item" }), [
    "operations",
    "projects",
  ]);
});
