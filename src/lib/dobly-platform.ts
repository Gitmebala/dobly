import "server-only";

export type DoblyCanonicalObject =
  | "space"
  | "operator"
  | "loop"
  | "run"
  | "conversation"
  | "approval"
  | "artifact"
  | "connection"
  | "memory";

export interface DoblyLayerMapping {
  layer: string;
  keepAs: DoblyCanonicalObject | "engine" | "legacy_surface";
  productMeaning: string;
  consolidationRule: string;
}

export const DOBLY_CANONICAL_OBJECTS: Record<DoblyCanonicalObject, {
  label: string;
  userMeaning: string;
  systemMeaning: string;
}> = {
  space: {
    label: "Space",
    userMeaning: "A business, work, life, family, or project context.",
    systemMeaning: "The boundary for permissions, memory, connections, Operators, and reporting.",
  },
  operator: {
    label: "Operator",
    userMeaning: "The thing Dobly creates when someone says what they want handled.",
    systemMeaning: "Owns the mission, outcome, capabilities, guardrails, connected tools, memory policy, and approval mode.",
  },
  loop: {
    label: "Loop",
    userMeaning: "A recurring or event-based system an Operator runs when that wording feels natural.",
    systemMeaning: "Defines trigger, cadence, playbook, schedule state, and run context.",
  },
  run: {
    label: "Run",
    userMeaning: "One actual attempt by Dobly to do work.",
    systemMeaning: "Durable execution record for queues, retries, status, logs, results, and worker pickup.",
  },
  conversation: {
    label: "Conversation",
    userMeaning: "The live chat where a user launches, steers, reviews, and corrects an Operator.",
    systemMeaning: "Threaded control surface connecting user instructions, Operator replies, runs, approvals, artifacts, memory changes, and audit events.",
  },
  approval: {
    label: "Approval",
    userMeaning: "A decision Dobly needs before doing something risky.",
    systemMeaning: "Unified gate for external actions like sending, publishing, payment, software changes, and memory updates.",
  },
  artifact: {
    label: "Artifact",
    userMeaning: "A file, draft, report, design, transcript, video, or output Dobly created.",
    systemMeaning: "Versioned output record with storage path, metadata, and provenance.",
  },
  connection: {
    label: "Connection",
    userMeaning: "An account or tool the user connects once so Dobly can act.",
    systemMeaning: "Native API, OAuth app, MCP server, browser session, provider token, or internal capability.",
  },
  memory: {
    label: "Memory",
    userMeaning: "What Dobly knows about preferences, rules, people, decisions, and history.",
    systemMeaning: "Approved knowledge layer used by Operators, with extraction, conflict checks, and confidence.",
  },
};

export const DOBLY_LAYER_MAPPINGS: DoblyLayerMapping[] = [
  {
    layer: "Original workflows, agents, automations, dashboard pages",
    keepAs: "loop",
    productMeaning: "Old builders become ways to create or inspect Operator Loops.",
    consolidationRule: "Do not sell these as separate products. Workflows are execution blueprints; automations are scheduled Loops; old agents become Operators.",
  },
  {
    layer: "Office, Homebase, coworker language",
    keepAs: "legacy_surface",
    productMeaning: "Homebase becomes the command view. Coworkers become Operators.",
    consolidationRule: "Keep useful command-center data, but remove coworker/worker language from user-facing UI.",
  },
  {
    layer: "Dobly OS command center",
    keepAs: "space",
    productMeaning: "The unified entry point for business, work, and life Spaces.",
    consolidationRule: "Dashboard should summarize Operators, Operator Chats, Loops, Runs, Approvals, Connections, Memory, and Artifacts.",
  },
  {
    layer: "Runtime execution spine",
    keepAs: "engine",
    productMeaning: "The hidden engine that makes Operators actually work.",
    consolidationRule: "Queues, approvals, artifacts, research, media, voice, memory, security, and workers stay technical internals.",
  },
  {
    layer: "Universal software and MCP execution",
    keepAs: "connection",
    productMeaning: "The universal tool layer that lets Operators use connected software without exposing APIs.",
    consolidationRule: "Expose as Connect Accounts / Tool Access, never as technical MCP setup for normal users.",
  },
];

export function getDoblyConsolidationSummary() {
  return {
    promise: "Tell Dobly what you want handled. Dobly creates the Operator and keeps the work moving.",
    mainObject: DOBLY_CANONICAL_OBJECTS.operator,
    objects: DOBLY_CANONICAL_OBJECTS,
    layers: DOBLY_LAYER_MAPPINGS,
  };
}
