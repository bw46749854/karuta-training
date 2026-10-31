import { expect, test } from "@playwright/test";

// ADR-0001 "起動時間の予算": the web version, from the second launch on,
// must be usable within 0.5 seconds.
const budgetMs = 500;

test("ADR-0001 起動時間の予算：2回目以降の起動が 0.5 秒以内", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("main").waitFor({ state: "attached" });

  await page.reload();
  await page.getByRole("main").waitFor({ state: "attached" });
  const elapsedMs = await page.evaluate(() => performance.now());

  expect(elapsedMs).toBeLessThan(budgetMs);
});
