import fs from "fs/promises";
import path from "path";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

function resolveSafePath(input: string) {
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, input);
  if (!resolved.startsWith(cwd)) {
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
