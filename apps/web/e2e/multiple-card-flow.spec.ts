import { WORDING } from "@karuta/ui";
import { expect, test, type Page } from "@playwright/test";

const C = WORDING.cardFlow;
const M = WORDING.multiple;
const S = WORDING.settings;

const KIMARIJI: Readonly<Record<number, string>> = {
  87: "む",
  18: "す",
  57: "め",
  22: "ふ",
  70: "さ",
  81: "ほ",
  74: "うか",
  65: "うら",
  23: "つき",
  40: "しの",
  37: "しら",
};

interface MultipleSettings {
  readonly poems: readonly number[];
  readonly count?: number;
  readonly perQuestion?: number;
  readonly displayMs?: number;
  readonly kimarijiChange?: boolean;
  readonly autoNext?: boolean;
  readonly waitMs?: number;
}

// ADR-0002 §5: Math.random gives 0 every time. The shuffle then puts the
// targets [a, b, c] (in the kimariji table's order) as b, c, a.
async function setUp(page: Page, settings: MultipleSettings): Promise<void> {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
  await page.getByRole("button", { name: WORDING.top.open.settings }).click();
  const poems = page.getByRole("region", { name: S.poems, exact: true });
  for (const poem of settings.poems) {
    await poems
      .getByRole("button", { name: S.poem(poem, KIMARIJI[poem] ?? "") })
      .click();
  }
  const multiple = page.getByRole("region", {
    name: S.sections.multiple,
    exact: true,
  });
  const number = (path: keyof typeof S.items, value: number) =>
    multiple
      .getByRole("spinbutton", { name: S.items[path] })
      .fill(String(value));
  await number("multiple.count", settings.count ?? 100);
  await number("multiple.perQuestion", settings.perQuestion ?? 2);
  await number("multiple.displayMs", settings.displayMs ?? 9999);
  await number("multiple.waitMs", settings.waitMs ?? 500);
  await multiple
    .getByRole("checkbox", { name: S.items["multiple.kimarijiChange"] })
    .setChecked(settings.kimarijiChange ?? false);
  await multiple
    .getByRole("checkbox", { name: S.items["multiple.autoNext"] })
    .setChecked(settings.autoNext ?? false);
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);
  await page.getByRole("button", { name: WORDING.common.backToTop }).click();
  await page.getByRole("button", { name: WORDING.top.open.multiple }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: M.title }),
  ).toBeVisible();
}

const card = (page: Page, poem: number) =>
  page.getByRole("img", { name: C.card(poem) });

const progress = (page: Page, finished: number, total: number) =>
  page.getByText(C.progressText(finished, total), { exact: true });

async function answer(page: Page, text: string): Promise<void> {
  await page.getByRole("textbox", { name: C.input }).fill(text);
  await page.getByRole("textbox", { name: C.input }).press("Enter");
}

test("仕様 06 §4 札は出現時間の後に伏せられ、判定すると表に戻る", async ({
  page,
}) => {
  await setUp(page, { poems: [87, 18, 57], count: 3, displayMs: 300 });
  await expect(card(page, 18)).toBeVisible();
  await expect(card(page, 57)).toBeVisible();
  await expect(page.getByRole("img", { name: M.hiddenCard(1) })).toBeVisible();
  await expect(page.getByRole("img", { name: M.hiddenCard(2) })).toBeVisible();
  await expect(card(page, 18)).toHaveCount(0);
  await answer(page, "す め");
  await expect(page.getByRole("status")).toHaveText(C.correct);
  await expect(card(page, 18)).toBeVisible();
  await expect(card(page, 57)).toBeVisible();
});

test("仕様 06 §5 §6 §7 B-03 B-04 B-07 B-08 ローマ字で答え、次へ進み、端数の問には前の札が残らず、終わったことが出る", async ({
  page,
}) => {
  await setUp(page, { poems: [87, 18, 57], count: 3 });
  await answer(page, "su,me");
  await expect(page.getByRole("status")).toHaveText(C.correct);
  await expect(progress(page, 2, 3)).toBeVisible();
  await page.getByRole("button", { name: C.next }).click();
  await expect(card(page, 87)).toBeVisible();
  await expect(page.getByRole("img")).toHaveCount(1);
  await answer(page, "む");
  await page.getByRole("button", { name: C.next }).click();
  await expect(page.getByRole("status")).toHaveText(C.finished);
  await expect(progress(page, 3, 3)).toBeVisible();
  await expect(page.getByRole("img")).toHaveCount(0);
});

test("仕様 06 §6 B-04 自動で次へ進む ON では、待機時間の後に次の問になる", async ({
  page,
}) => {
  await setUp(page, {
    poems: [87, 18, 57],
    count: 3,
    autoNext: true,
    waitMs: 300,
  });
  await answer(page, "す め");
  await expect(page.getByRole("status")).toHaveText(C.correct);
  await expect(card(page, 87)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("");
});

test("仕様 06 §5.2 B-25 空欄・区切りだけ・多すぎる答えは受け付けない", async ({
  page,
}) => {
  await setUp(page, { poems: [87, 18, 57], count: 3 });
  const input = page.getByRole("textbox", { name: C.input });
  await expect(page.getByRole("button", { name: C.answer })).toBeDisabled();
  await answer(page, "、、");
  await expect(page.getByRole("status")).toHaveText(
    M.notices["separators-only"],
  );
  await expect(input).toHaveValue("");
  await answer(page, "す め む");
  await expect(page.getByRole("status")).toHaveText(M.notices["too-many"]);
  await expect(input).toHaveValue("");
  await expect(progress(page, 0, 3)).toBeVisible();
});

test("仕様 06 §5.4 B-05 決まり字変化を考慮する ON では、前の問の札で決まり字が変わる", async ({
  page,
}) => {
  // [74, 65, 23] → うら, つき | うか.
  await setUp(page, { poems: [74, 65, 23], count: 3, kimarijiChange: true });
  await answer(page, "うら つき");
  await expect(page.getByRole("status")).toHaveText(C.correct);
  await page.getByRole("button", { name: C.next }).click();
  await answer(page, "う");
  await expect(page.getByRole("status")).toHaveText(C.correct);
});

test("仕様 06 §5.4 B-06 最後の1枚の問でも、まだ出ていない歌で決まり字は変わらない", async ({
  page,
}) => {
  // [23, 40, 37] → しの, しら | つき: つく is not read, so つき stays.
  await setUp(page, { poems: [23, 40, 37], count: 3, kimarijiChange: true });
  await answer(page, "しの しら");
  await page.getByRole("button", { name: C.next }).click();
  await expect(card(page, 23)).toBeVisible();
  await answer(page, "つき");
  await expect(page.getByRole("status")).toHaveText(C.correct);
});

test("仕様 06 §5.4 決まり字変化を考慮する OFF では、静的決まり字が正解", async ({
  page,
}) => {
  await setUp(page, { poems: [74, 65, 23], count: 3 });
  await answer(page, "うら つき");
  await page.getByRole("button", { name: C.next }).click();
  await answer(page, "うか");
  await expect(page.getByRole("status")).toHaveText(C.correct);
});

test("仕様 06 §8 B-09 B-19 B-20 一覧は出題の対象だけで、札ごとの正誤とスキップを出し、出題順は問の中の位置の順", async ({
  page,
}) => {
  await setUp(page, { poems: [87, 18, 57], count: 3 });
  await answer(page, "す む");
  await expect(page.getByRole("status")).toHaveText(M.wrong);
  await page.getByRole("button", { name: C.next }).click();
  await page.getByRole("button", { name: C.skip }).click();
  await page.getByRole("button", { name: C.openList }).click();
  const list = page.getByRole("region", { name: C.list });
  const rows = list.getByRole("listitem");
  await expect(rows).toHaveCount(3);
  const row = (poem: number) =>
    rows.filter({ hasText: C.row(poem, KIMARIJI[poem] ?? "") });
  await expect(row(18)).toContainText(C.status("correct", false, true));
  await expect(row(57)).toContainText(C.status("wrong", false, true));
  await expect(row(87)).toContainText(C.status("skipped", false, true));
  await list.getByRole("button", { name: C.byAsked }).click();
  await expect(rows).toHaveText([
    new RegExp(C.row(18, "す")),
    new RegExp(C.row(57, "め")),
    new RegExp(C.row(87, "む")),
  ]);
});

test("仕様 06 §3.3 6枚の札は、1枚目を下段右に、6枚目を上段左に置く", async ({
  page,
}) => {
  // [87, 18, 57, 22, 70, 81] → 18, 57, 22, 70, 81, 87 (places 1 to 6).
  await setUp(page, {
    poems: [87, 18, 57, 22, 70, 81],
    count: 6,
    perQuestion: 6,
  });
  const places = new Map<number, { x: number; y: number }>();
  for (const [index, poem] of [18, 57, 22, 70, 81, 87].entries()) {
    const found = await card(page, poem).boundingBox();
    if (found === null) {
      throw new Error(`No card ${String(poem)}`);
    }
    places.set(index + 1, found);
  }
  const at = (place: number) =>
    places.get(place) ?? { x: Number.NaN, y: Number.NaN };
  // Lower row, right to left: 1, 2, 5. Upper row, right to left: 3, 4, 6.
  expect([at(2).y, at(5).y]).toEqual([at(1).y, at(1).y]);
  expect([at(4).y, at(6).y]).toEqual([at(3).y, at(3).y]);
  expect(at(3).y).toBeLessThan(at(1).y);
  expect(at(1).x).toBeGreaterThan(at(2).x);
  expect(at(2).x).toBeGreaterThan(at(5).x);
  expect([at(3).x, at(4).x, at(6).x]).toEqual([at(1).x, at(2).x, at(5).x]);
});
