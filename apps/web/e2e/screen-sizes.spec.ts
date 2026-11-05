import { WORDING } from "@karuta/ui";
import { expect, test, type Locator, type Page } from "@playwright/test";

const C = WORDING.cardFlow;

// ADR-0007 §10: the sizes the screens are checked at. Here every size runs
// on every engine of the project list.
const SIZES = [
  { name: "デスクトップ", width: 1280, height: 720 },
  { name: "iPad 横", width: 1180, height: 820 },
  { name: "iPad 縦", width: 810, height: 1080 },
  { name: "Steam Deck", width: 1280, height: 800 },
  { name: "スマートフォン横", width: 844, height: 390 },
  { name: "スマートフォン縦", width: 390, height: 844 },
] as const;

async function expectInside(
  page: Page,
  part: Locator,
  size: { readonly width: number; readonly height: number },
): Promise<void> {
  const box = await part.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(size.width);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test(`ADR-0007 §7 仕様 05 §3 札流しの、札・入力欄・ボタン・判定が、スクロールせずに1画面に収まる（${size.name}）`, async ({
      page,
    }) => {
      await page.goto("/#/card-flow");
      await page.getByRole("img").waitFor();
      for (const part of [
        page.getByRole("img"),
        page.getByRole("textbox", { name: C.input }),
        page.getByRole("button", { name: C.answer }),
        page.getByRole("button", { name: C.skip }),
        page.getByRole("status"),
      ]) {
        await expectInside(page, part, size);
      }
    });

    test(`ADR-0007 §7 仕様 06 §3 札流し（複数枚）の、札・入力欄・ボタン・判定が、スクロールせずに1画面に収まる（${size.name}）`, async ({
      page,
    }) => {
      await page.goto("/#/multiple");
      await page.getByRole("img").first().waitFor();
      const cards = await page.getByRole("img").all();
      for (const part of [
        ...cards,
        page.getByRole("textbox", { name: C.input }),
        page.getByRole("button", { name: C.answer }),
        page.getByRole("button", { name: C.skip }),
        page.getByRole("status"),
      ]) {
        await expectInside(page, part, size);
      }
    });

    test(`ADR-0007 §7 仕様 04 §4.3 設定画面は、横にはみ出さない（${size.name}）`, async ({
      page,
    }) => {
      await page.goto("/#/settings");
      await page
        .getByRole("heading", { name: WORDING.settings.sections.layouts })
        .waitFor();
      const width = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(width).toBeLessThanOrEqual(size.width);
    });
  });
}
