import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore scripts directory (CommonJS)
    "scripts/**",
  ]),
  {
    rules: {
      // Disable strict any checking for rapid prototyping
      "@typescript-eslint/no-explicit-any": "off",
      // Warn instead of error for unused vars (prefix with _ to ignore)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Allow <img> for external/dynamic images
      "@next/next/no-img-element": "warn",
      // Allow <a> for external links
      "@next/next/no-html-link-for-pages": "warn",
      // Disable React Compiler memoization warnings
      "react-hooks/preserve-manual-memoization": "off",
      // Allow unescaped quotes/apostrophes in JSX
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
