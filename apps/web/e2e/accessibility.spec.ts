import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const seriousImpacts = new Set(["serious", "critical"]);

test("設計方針 §4 アクセシビリティ：重大な違反がない", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) =>
      violation.impact != null && seriousImpacts.has(violation.impact),
  );

  expect(serious).toEqual([]);
});
