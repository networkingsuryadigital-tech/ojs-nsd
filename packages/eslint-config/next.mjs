import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { baseIgnores } from "./base.mjs";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig([baseIgnores, ...nextVitals, ...nextTs]);
