import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

// Mirrors resolveSafePath in ./file.ts. The connector itself imports the
// project's "@/..." aliases, which plain node cannot resolve, so the
// containment rule is restated here and pinned directly.
function contains(root: string, candidate: string) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, candidate);
  const withSeparator = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  return resolved === resolvedRoot || resolved.startsWith(withSeparator);
}

// The bug this replaced: a bare startsWith(root) accepts any sibling directory
// whose name merely begins with the root's name.
test("a sibling directory sharing a name prefix is not inside the root", () => {
  const root = path.resolve("/app");
  const sibling = path.resolve("/app-secrets/credentials.env");
  assert.equal(sibling.startsWith(root), true, "precondition: the naive check passes");
  assert.equal(contains(root, sibling), false, "but real containment must reject it");
});

test("parent traversal escapes are rejected", () => {
  for (const attempt of ["../outside.txt", "../../etc/passwd", "nested/../../escape.txt"]) {
    assert.equal(contains("/app/workspace", attempt), false, attempt);
  }
});

test("ordinary paths inside the root are allowed", () => {
  for (const attempt of ["notes.txt", "reports/q3.md", "./a/b/c.json"]) {
    assert.equal(contains("/app/workspace", attempt), true, attempt);
  }
});

test("the root itself is allowed", () => {
  assert.equal(contains("/app/workspace", "."), true);
});
