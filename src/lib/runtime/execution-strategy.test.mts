import test from "node:test";
import assert from "node:assert/strict";
import { inferDoblyExecutionIntent } from "../dobly-inference.ts";
import { previewDoblyExecutionStrategyCore } from "./execution-strategy-core.ts";

test("artifact-first marketing work prefers a native outcome engine over software by default", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Create a launch video, image set, and campaign brief for our new product.",
    availability: {
      softwareTools: { creative_media_ops: true, figma_design: true },
      runtimes: { media: true },
    },
  });

  const strategy = previewDoblyExecutionStrategyCore({
    prompt: "Create a launch video, image set, and campaign brief for our new product.",
    intent,
    tools: [
      { id: "creative_media_ops", label: "Creative Media Operations", family: "media", outputType: "media_asset", approvalRequired: true, configured: true },
      { id: "figma_design", label: "Figma Design", family: "design", outputType: "design_file", approvalRequired: true, configured: true },
    ],
  });

  assert.equal(strategy.primary.kind, "native_outcome_engine");
  assert.equal(strategy.primary.route, "media");
});

test("explicit software asks prefer a static-core MCP path", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Use GitHub to prepare the pull request, package the release notes, and update the repo.",
    availability: {
      softwareTools: { github_repo_ops: true },
      runtimes: { research: true },
    },
  });

  const strategy = previewDoblyExecutionStrategyCore({
    prompt: "Use GitHub to prepare the pull request, package the release notes, and update the repo.",
    intent,
    tools: [
      { id: "github_repo_ops", label: "GitHub Repository Operations", family: "code", outputType: "code_change", approvalRequired: true, configured: true },
    ],
  });

  assert.equal(strategy.primary.kind, "static_core_mcp");
  assert.equal(strategy.primary.toolId, "github_repo_ops");
});

test("human-only finance work stays on a guarded native engine", () => {
  const intent = inferDoblyExecutionIntent({
    prompt: "Collect the overdue invoice payment and update the finance records.",
    availability: {
      softwareTools: { finance_backoffice_ops: true },
      runtimes: { payments_commerce: true },
    },
  });

  const strategy = previewDoblyExecutionStrategyCore({
    prompt: "Collect the overdue invoice payment and update the finance records.",
    intent,
    tools: [
      { id: "finance_backoffice_ops", label: "Finance Back Office Operations", family: "finance", outputType: "financial_record", approvalRequired: true, configured: true },
    ],
  });

  assert.equal(strategy.primary.route, "payments_commerce");
  assert.equal(strategy.primary.requiresApproval, true);
});
