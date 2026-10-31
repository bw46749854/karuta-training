import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "packages/domain/src/**/*.ts",
        "packages/application/src/**/*.ts",
      ],
      exclude: ["**/*.test.ts"],
      // Design principles §4: line and branch coverage of 95% or more.
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
