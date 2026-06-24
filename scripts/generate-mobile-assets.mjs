import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "src", "app", "icon.svg");
const destination = path.join(root, "mobile", "assets");
await fs.mkdir(destination, { recursive: true });
await Promise.all([
  sharp(source).resize(1024, 1024).png().toFile(path.join(destination, "icon.png")),
  sharp(source).resize(768, 768).extend({ top: 128, bottom: 128, left: 128, right: 128, background: "#fff8f1" }).png().toFile(path.join(destination, "adaptive-icon.png")),
  sharp(source).resize(320, 320).extend({ top: 352, bottom: 352, left: 352, right: 352, background: "#fff8f1" }).png().toFile(path.join(destination, "splash.png")),
]);
console.log("Generated Dobly mobile icon, adaptive icon, and splash assets.");
