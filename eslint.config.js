// @ts-check
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// Globals that make domain and application non-deterministic or tie them to
// a platform. They get these through ports instead (design principles §2.2).
const restrictedGlobals = [
  ["Date", "時刻は Clock ポートから受け取る"],
  ["performance", "時刻は Clock ポートから受け取る"],
  ["setTimeout", "時間の経過は Scheduler ポートに任せる"],
  ["setInterval", "時間の経過は Scheduler ポートに任せる"],
  ["clearTimeout", "時間の経過は Scheduler ポートに任せる"],
  ["clearInterval", "時間の経過は Scheduler ポートに任せる"],
  ["queueMicrotask", "時間の経過は Scheduler ポートに任せる"],
  ["requestAnimationFrame", "時間の経過は Scheduler ポートに任せる"],
  ["crypto", "乱数は Random ポートから受け取る"],
  ["fetch", "通信はポートを通して行う"],
  ["localStorage", "保存は Repository ポートを通して行う"],
  ["sessionStorage", "保存は Repository ポートを通して行う"],
  ["window", "domain と application はブラウザに依存しない"],
  ["document", "domain と application はブラウザに依存しない"],
  ["globalThis", "domain と application はブラウザに依存しない"],
].map(([name, message]) => ({ name, message }));

export default defineConfig(
  globalIgnores([
    "**/dist/**",
    "**/dist-types/**",
    "**/coverage/**",
    "reports/**",
    ".stryker-tmp/**",
    "**/test-results/**",
    "**/playwright-report/**",
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  eslintComments.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "@eslint-community/eslint-comments/require-description": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-console": "error",
      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 3],
      "max-lines-per-function": [
        "error",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["packages/domain/**", "packages/application/**"],
    rules: {
      "no-restricted-globals": ["error", ...restrictedGlobals],
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "乱数は Random ポートから受け取る",
        },
      ],
    },
  },
);
