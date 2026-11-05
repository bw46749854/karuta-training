import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const seriousImpacts = new Set(["serious", "critical"]);

for (const [name, path] of [
  ["トップ画面", "/"],
  ["設定画面", "/#/settings"],
] as const) {
  test(`設計方針 §4 アクセシビリティ：${name}に重大な違反がない`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.getByRole("main").waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact != null && seriousImpacts.has(violation.impact),
    );

    expect(serious).toEqual([]);
  });
}
