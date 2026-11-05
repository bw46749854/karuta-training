import { WORDING } from "@karuta/ui";
import { expect, test, type Locator, type Page } from "@playwright/test";

const C = WORDING.cardFlow;
const P = WORDING.placement;

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

type Size = (typeof SIZES)[number];

async function expectInside(
  page: Page,
  parts: readonly Locator[],
  size: Size,
): Promise<void> {
  for (const part of parts) {
    const box = await part.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

/** The answer, the buttons and the judgement of the card flows. */
const answering = (page: Page) => [
  page.getByRole("textbox", { name: C.input }),
  page.getByRole("button", { name: C.answer }),
  page.getByRole("button", { name: C.skip }),
  page.getByRole("status"),
];

async function cardFlowFits(page: Page, size: Size): Promise<void> {
  await page.goto("/#/card-flow");
  await page.getByRole("img").waitFor();
  await expectInside(page, [page.getByRole("img"), ...answering(page)], size);
}

async function multipleFits(page: Page, size: Size): Promise<void> {
  await page.goto("/#/multiple");
  await page.getByRole("img").first().waitFor();
  const cards = await page.getByRole("img").all();
  await expectInside(page, [...cards, ...answering(page)], size);
}

async function placementFits(page: Page, size: Size): Promise<void> {
  await page.goto("/#/placement");
  if (size.width < size.height) {
    await expect(page.getByText(P.rotate)).toBeVisible();
    return;
  }
  await page.getByRole("button", { name: /段目/ }).first().waitFor();
  await page.getByRole("button", { name: P.start, exact: true }).click();
  const cells = await page.getByRole("button", { name: /段目/ }).all();
  expect(cells.length).toBeGreaterThan(0);
  const control = (name: string) =>
    page.getByRole("button", { name, exact: true });
  await expectInside(
    page,
    [
      ...cells,
      page.getByText(/^問：/),
      control(C.answer),
      control(C.skip),
      control(P.end),
      page.getByRole("status"),
    ],
    size,
  );
}

async function playFits(page: Page, size: Size): Promise<void> {
  await page.goto("/#/placement");
  if (size.width < size.height) {
    await expect(page.getByText(P.rotate)).toBeVisible();
    return;
  }
  await page.getByRole("button", { name: /段目/ }).first().waitFor();
  await page
    .getByRole("button", { name: WORDING.play.start, exact: true })
    .click();
  await page.getByText(/^読み：/).waitFor();
  const cells = await page.getByRole("button", { name: /段目/ }).all();
  expect(cells.length).toBeGreaterThan(0);
  await expectInside(
    page,
    [
      ...cells,
      page.getByText(/^読み：/),
      page.getByRole("button", { name: WORDING.play.finish, exact: true }),
      page.getByRole("status"),
    ],
    size,
  );
}

async function settingsFits(page: Page, size: Size): Promise<void> {
  await page.goto("/#/settings");
  await page
    .getByRole("heading", { name: WORDING.settings.sections.layouts })
    .waitFor();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(size.width);
}

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test(`ADR-0007 §7 仕様 05 §3 札流しの、札・入力欄・ボタン・判定が、スクロールせずに1画面に収まる（${size.name}）`, async ({
      page,
    }) => {
      await cardFlowFits(page, size);
    });

    test(`ADR-0007 §7 仕様 06 §3 札流し（複数枚）の、札・入力欄・ボタン・判定が、スクロールせずに1画面に収まる（${size.name}）`, async ({
      page,
    }) => {
      await multipleFits(page, size);
    });

    test(`ADR-0007 §3 §7 仕様 07 §2 配置暗記は、横向きなら盤面・問・ボタン・判定が1画面に収まり、縦向きなら案内を出す（${size.name}）`, async ({
      page,
    }) => {
      await placementFits(page, size);
    });

    test(`ADR-0007 §3 §7 仕様 08 §2.6 実践練習は、横向きなら盤面・読み・ボタン・判定が1画面に収まる（${size.name}）`, async ({
      page,
    }) => {
      await playFits(page, size);
    });

    test(`ADR-0007 §7 仕様 04 §4.3 設定画面は、横にはみ出さない（${size.name}）`, async ({
      page,
    }) => {
      await settingsFits(page, size);
    });
  });
}
