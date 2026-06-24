import { existsSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const target = resolve(process.cwd(), ".next");

if (!target.endsWith(`${sep}.next`)) {
  throw new Error(`Refusing to delete unexpected path: ${target}`);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
  console.log(`Cleared ${target}`);
} else {
  console.log(`No .next directory found at ${target}`);
}
