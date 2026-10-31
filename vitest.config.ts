import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.{ts,tsx}"],
    // Stage 1 has no tests yet. Remove this with the first domain test
    // (plan, stage 2), so that a package without tests fails the run.
    passWithNoTests: true,
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
