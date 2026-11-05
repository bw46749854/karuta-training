import { WORDING } from "@karuta/ui";
import { expect, test, type Page } from "@playwright/test";

const C = WORDING.cardFlow;
const P = WORDING.placement;
const Y = WORDING.play;
const S = WORDING.settings;

const KIMARIJI: Readonly<Record<number, string>> = {
  39: "あさじ",
  31: "あさぼらけあ",
  64: "あさぼらけう",
  74: "うか",
};

// A landscape screen whose board is 6 rows by 11 columns (spec 07 §2).
test.use({ viewport: { width: 1280, height: 720 } });

// ADR-0002 §5: Math.random gives 0 every time. Then [39, 31, 64] are dealt
// as 31 at row 1 column 1, 64 at row 6 column 11 and 39 at row 6 column
// 10, and read as 31, 64, 39. [74] alone is dealt at row 6 column 11.
// [31, 64] are dealt as 64 at row 1 column 1 and 31 at row 6 column 11,
// and read as 64, 31.
async function setUp(
  page: Page,
  poems: readonly number[],
  intervalMs: number,
): Promise<void> {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
  await page.getByRole("button", { name: WORDING.top.open.settings }).click();
  const list = page.getByRole("region", { name: S.poems, exact: true });
  for (const poem of poems) {
    await list
      .getByRole("button", { name: S.poem(poem, KIMARIJI[poem] ?? "") })
      .click();
  }
  await page
    .getByRole("region", { name: S.sections.play, exact: true })
    .getByRole("spinbutton", { name: S.items["play.letterIntervalMs"] })
    .fill(String(intervalMs));
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);
  await page.getByRole("button", { name: WORDING.common.backToTop }).click();
  await page.getByRole("button", { name: WORDING.top.open.placement }).click();
  await page.getByRole("button", { name: Y.start, exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: Y.title }),
  ).toBeVisible();
}

const card = (
  page: Page,
  [row, column, poem]: readonly [number, number, number],
) => page.getByRole("button", { name: P.cardCell(row, column, poem) });

const press = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();

test("仕様 08 §2.1 §4.1 配置暗記のプレイ開始で、同じ盤面のまま、決まり字を1文字ずつ読み始める", async ({
  page,
}) => {
  await setUp(page, [39, 31, 64], 300);
  await expect(card(page, [1, 1, 31])).toBeVisible();
  await expect(card(page, [6, 11, 64])).toBeVisible();
  await expect(card(page, [6, 10, 39])).toBeVisible();
  await expect(page.getByText(Y.letters("あ"), { exact: true })).toBeVisible();
  await expect(
    page.getByText(Y.letters("あさぼらけあ"), { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(Y.missed);
  // Spec 08 §4.4: the read card leaves the board.
  await expect(card(page, [1, 1, 31])).toHaveCount(0);
});

test("仕様 08 §2.4 B-14 盤面がないときは、そのことと、配置暗記へ移るボタンを出す", async ({
  page,
}) => {
  await page.goto("/#/play");
  await expect(page.getByText(Y.noBoard)).toBeVisible();
  await press(page, Y.toPlacement);
  await expect(
    page.getByRole("heading", { level: 1, name: P.title }),
  ).toBeVisible();
});

test("仕様 08 §5 決まる文字を出した後、取れる間に取ると正解", async ({
  page,
}) => {
  await setUp(page, [74], 1000);
  await expect(
    page.getByText(Y.letters("うか"), { exact: true }),
  ).toBeVisible();
  await card(page, [6, 11, 74]).click();
  await expect(page.getByRole("status")).toHaveText(Y.correct);
});

test("仕様 08 §5 B-15 1首だけに限定しても、うら がまだ読まれていなければ、う で取ると早い", async ({
  page,
}) => {
  await setUp(page, [74], 1000);
  await expect(page.getByText(Y.letters("う"), { exact: true })).toBeVisible();
  await card(page, [6, 11, 74]).click();
  await expect(page.getByRole("status")).toHaveText(/^早い：0\.\d\d 秒$/);
});

test("仕様 08 §5 違う札を取ると、違う札と出る", async ({ page }) => {
  await setUp(page, [39, 31, 64], 300);
  await card(page, [6, 10, 39]).click();
  await expect(page.getByRole("status")).toHaveText(Y.wrongCard);
});

test("仕様 08 §6 B-16 読んでいる途中のスキップで、その札を取り除き、次の問は前の問に左右されない", async ({
  page,
}) => {
  await setUp(page, [31, 64], 500);
  await expect(
    page.getByText(Y.letters("あさ"), { exact: true }),
  ).toBeVisible();
  await press(page, C.skip);
  await expect(card(page, [1, 1, 64])).toHaveCount(0);
  await expect(card(page, [6, 11, 31])).toBeVisible();
  await expect(page.getByText(C.progressText(1, 2))).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(Y.missed, {
    timeout: 6000,
  });
  await expect(page.getByText(C.progressText(2, 2))).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.getByRole("status")).toHaveText(Y.missed);
  await expect(page.getByText(C.progressText(2, 2))).toBeVisible();
});

test("仕様 08 §7.5 プレイ終了で、取り除いた札も戻した元の盤面の配置暗記に戻る", async ({
  page,
}) => {
  await setUp(page, [39, 31, 64], 300);
  await press(page, C.skip);
  await expect(card(page, [1, 1, 31])).toHaveCount(0);
  // A new deal would now put the cards elsewhere.
  await page.evaluate(() => {
    Math.random = () => 0.99;
  });
  await press(page, Y.finish);
  await expect(
    page.getByRole("heading", { level: 1, name: P.title }),
  ).toBeVisible();
  await expect(card(page, [1, 1, 31])).toBeVisible();
  await expect(card(page, [6, 11, 64])).toBeVisible();
  await expect(card(page, [6, 10, 39])).toBeVisible();
});
