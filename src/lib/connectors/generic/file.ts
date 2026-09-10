import fs from "fs/promises";
import path from "path";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

/**
 * Root that file writes are confined to.
 *
 * This connector is reachable by coworkers, which means the path is chosen by
 * a model from a user's instruction rather than by application code. Writing
 * anywhere under process.cwd() therefore included the app's own source tree
 * and its .env files, so a single badly-worded instruction could overwrite
 * them. Confine writes to a dedicated directory instead - the error message
 * already claimed this was the behaviour ("inside the Dobly workspace"); now
 * it is.
 */
function workspaceRoot() {
  const configured = process.env.DOBLY_FILE_WORKSPACE?.trim();
  return path.resolve(configured || path.join(process.cwd(), ".dobly-workspace"));
}

function resolveSafePath(input: string) {
  const root = workspaceRoot();
  const resolved = path.resolve(root, input);

  // Boundary-aware containment. A bare startsWith(root) is not a containment
  // check: with root "/app" it also accepts "/app-secrets/x", which is a
  // different directory entirely. Comparing against root + separator (and
  // allowing root itself) is the actual test.
  const withSeparator = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(withSeparator)) {
    throw new Error("File connector can only write inside the Dobly workspace.");
  }
  return resolved;
}

export const fileConnectorExecutor: ConnectorExecutor = {
  id: "generic.file",
  async execute(context) {
    const filePath = String(context.config.path ?? "").trim();
    if (!filePath) {
      throw new Error("File connector requires a path.");
    }

    const resolved = resolveSafePath(filePath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });

    const mode = String(context.config.mode ?? "write");
    const content =
      typeof context.config.content === "string"
        ? context.config.content
        : JSON.stringify(context.config.content ?? {}, null, 2);

    if (mode === "append") {
      await fs.appendFile(resolved, content);
    } else {
      await fs.writeFile(resolved, content);
    }

    return {
      path: resolved,
      mode,
      bytes: Buffer.byteLength(content),
    };
  },
};
