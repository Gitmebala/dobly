import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: dirname });

export default [
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "node_modules/**",
      "mobile/**",
      "remotion/**",
      "public/**",
      "coverage/**",
      "dist/**",
      "out/**",
      "build/**",
      ".chrome-*/**",
      ".edge-*/**",
      ".claude/**",
      ".codex/**",
      ".codex-*/**",
      "tmpclaude-*/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];
