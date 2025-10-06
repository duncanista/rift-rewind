import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      quotes: ["error", "double"], // Enforce single quotes
      semi: ["error", "always"], // Require semicolons
      "no-unused-vars": ["error"], // Warn about unused variables
      "no-console": ["warn"], // Warn about console.log usage
      eqeqeq: ["error", "always"], // Require === and !==
      "comma-dangle": ["error", "always-multiline"], // Trailing commas for multiline
      "object-curly-spacing": ["error", "always"], // Spaces inside curly braces
      "arrow-spacing": ["error", { before: true, after: true }], // Spaces around arrow functions
      indent: ["error", 2], // 2-space indentation
    },
  },
];

export default eslintConfig;
