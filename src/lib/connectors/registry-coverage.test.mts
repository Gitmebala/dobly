import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Dobly routes tool calls through two independent tables, and an executor can
// be perfectly implemented yet unreachable from one of them. That is invisible
// at runtime: the coworker just reports "no execution path available" for a
// capability that demonstrably works elsewhere. 25 executors were unreachable
// from the coworker path this way - every non-"create" verb (send a campaign,
// update a ticket, post to social, issue a refund, read form responses) plus
// every generic escape hatch. These tests pin both tables to the full set.
//
// Static source analysis rather than imports: registry.ts pulls in the whole
// connector tree through "@/..." aliases that plain node cannot resolve.

const here = dirname(fileURLToPath(import.meta.url));

function read(relativePath: string) {
  return readFileSync(join(here, relativePath), "utf8");
}

/** Every executor id actually defined anywhere under lib/connectors. */
function definedExecutorIds() {
  const ids = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        for (const match of readFileSync(full, "utf8").matchAll(/\bid:\s*"((?:native|generic)\.[a-z0-9._-]+)"/g)) {
          ids.add(match[1]);
        }
      }
    }
  };
  walk(here);
  return ids;
}

/** Text of a `const <name> = new Map([...])` / `= {...}` block. */
function block(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `could not find ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `could not find end of ${startMarker}`);
  return source.slice(start, end);
}

function executorVarNames(text: string) {
  return new Set([...text.matchAll(/([a-zA-Z0-9]+Executor)\.id/g)].map((match) => match[1]));
}

test("every registered executor is reachable from a workflow step", () => {
  const registry = read("registry.ts");
  const registered = executorVarNames(block(registry, "const EXECUTORS", "]);"));
  const reachable = executorVarNames(block(registry, "const STEP_EXECUTOR_MAP", "]);"));

  assert.ok(registered.size > 50, `expected the full executor set, saw ${registered.size}`);

  const orphans = [...registered].filter((name) => !reachable.has(name)).sort();
  assert.deepEqual(
    orphans,
    [],
    `registered but no STEP_EXECUTOR_MAP entry, so workflows can never run them: ${orphans.join(", ")}`,
  );
});

test("every executor is reachable from a coworker tool call", () => {
  const defined = definedExecutorIds();
  const bridge = read("../office/native-tool-bridge.ts");
  const targets = new Set([...bridge.matchAll(/"((?:native|generic)\.[a-z0-9._-]+)"/g)].map((match) => match[1]));

  assert.ok(defined.size > 50, `expected the full executor set, saw ${defined.size}`);

  const unreachable = [...defined].filter((id) => !targets.has(id)).sort();
  assert.deepEqual(
    unreachable,
    [],
    `no coworker tool name maps to these, so coworkers cannot use them: ${unreachable.join(", ")}`,
  );
});

test("the coworker bridge never points at an executor that does not exist", () => {
  const defined = definedExecutorIds();
  const bridge = read("../office/native-tool-bridge.ts");
  const targets = new Set([...bridge.matchAll(/"((?:native|generic)\.[a-z0-9._-]+)"/g)].map((match) => match[1]));

  const dangling = [...targets].filter((id) => !defined.has(id)).sort();
  assert.deepEqual(dangling, [], `bridge maps to non-existent executors: ${dangling.join(", ")}`);
});
