import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export const baseIgnores = globalIgnores([
  ".next/**",
  "out/**",
  "build/**",
  "dist/**",
  "next-env.d.ts",
  "node_modules/**",
]);

export function createBaseConfig(extra = []) {
  return defineConfig([baseIgnores, ...extra]);
}
