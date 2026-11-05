import { WORDING } from "@karuta/ui";
import { expect, test, type Page } from "@playwright/test";

const C = WORDING.cardFlow;
const S = WORDING.settings;

const KIMARIJI: Readonly<Record<number, string>> = {
  87: "む",
  18: "す",
  57: "め",
  22: "ふ",
  70: "さ",
  65: "うら",
  74: "うか",
};

interface CardFlowSettings {
  readonly poems: readonly number[];
  readonly count?: number;
  readonly kimarijiChange?: boolean;
  readonly autoNext?: boolean;
  readonly waitMs?: number;
  readonly upsideDown?: boolean;
}

// ADR-0002 §5: Math.random gives 0 every time, so the order is fixed. With
// 0, the shuffle puts [87, 18, 57] as 18, 57, 87, and [74, 65] as 65, 74.
async function fixRandom(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
}

// Sets up as a person would: on the settings screen, then saves.
async function setUp(page: Page, settings: CardFlowSettings): Promise<void> {
  await fixRandom(page);
  await page.goto("/");
  await page.getByRole("button", { name: WORDING.top.open.settings }).click();
  const poems = page.getByRole("region", { name: S.poems, exact: true });
  for (const poem of settings.poems) {
    await poems
      .getByRole("button", { name: S.poem(poem, KIMARIJI[poem] ?? "") })
      .click();
  }
  const cardFlow = page.getByRole("region", {
    name: S.sections.cardFlow,
    exact: true,
  });
  const number = (path: keyof typeof S.items) =>
    cardFlow.getByRole("spinbutton", { name: S.items[path] });
  const flag = (path: keyof typeof S.items) =>
    cardFlow.getByRole("checkbox", { name: S.items[path] });
  await number("cardFlow.count").fill(String(settings.count ?? 100));
  await number("cardFlow.waitMs").fill(String(settings.waitMs ?? 500));
  await flag("cardFlow.kimarijiChange").setChecked(
    settings.kimarijiChange ?? true,
  );
  await flag("cardFlow.autoNext").setChecked(settings.autoNext ?? false);
  if (settings.upsideDown === true) {
    await cardFlow
      .getByRole("combobox", { name: S.items["cardFlow.orientation"] })
      .selectOption({ label: S.options["upside-down"] });
  }
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);
  await page.getByRole("button", { name: WORDING.common.backToTop }).click();
  await page
    .getByRole("button", { name: WORDING.top.open["card-flow"] })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: C.title }),
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

test("仕様 05 §2 §3 トップから開くと、1問目の札と進捗が出る。トップへ戻れる", async ({
  page,
}) => {
  await setUp(page, { poems: [87, 18, 57], count: 3 });
  await expect(card(page, 18)).toBeVisible();
  await expect(progress(page, 0, 3)).toBeVisible();
  await page.getByRole("button", { name: WORDING.common.backToTop }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: WORDING.top.title }),
  ).toBeVisible();
});

test("仕様 05 §4.3 B-22 答えると、正解か、正解の決まり字と理由が出る", async ({
  page,
}) => {
  await setUp(page, { poems: [87, 18, 57], count: 3 });
  await answer(page, "す");
  await expect(page.getByRole("status")).toHaveText(C.correct);
  await expect(progress(page, 1, 3)).toBeVisible();
  await page.getByRole("button", { name: C.next }).click();
  await expect(card(page, 57)).toBeVisible();
  await answer(page, "メ");
  await expect(page.getByRole("status")).toContainText(C.wrong("め"));
  await expect(page.getByRole("status")).toContainText(
    C.reasons["not-kana-or-romaji"],
  );
});

test("仕様 05 §4.2 B-25 空欄では答えられない", async ({ page }) => {
  await setUp(page, { poems: [87, 18, 57], count: 3 });
  await expect(page.getByRole("button", { name: C.answer })).toBeDisabled();
  await page.getByRole("textbox", { name: C.input }).press("Enter");
  await expect(page.getByRole("status")).toHaveText("");
  await expect(progress(page, 0, 3)).toBeVisible();
});

test("仕様 05 §5 §6 B-21 B-24 スキップを続けると進捗が進んで終わり、終わった後はスキップできない", async ({
  page,
}) => {
  await setUp(page, { poems: [87, 18, 57, 22, 70], count: 3 });
  for (const finished of [0, 1, 2]) {
    await expect(progress(page, finished, 3)).toBeVisible();
    await page.getByRole("button", { name: C.skip }).click();
  }
  await expect(progress(page, 3, 3)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(C.finished);
  await expect(page.getByRole("img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: C.skip })).toHaveCount(0);
  await expect(page.getByRole("button", { name: C.next })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: C.input })).toBeDisabled();
});

test("仕様 05 §4.4 B-01 決まり字変化を考慮する OFF では、静的決まり字が正解", async ({
  page,
}) => {
  await setUp(page, { poems: [74, 65], count: 2, kimarijiChange: false });
  await expect(card(page, 65)).toBeVisible();
  await answer(page, "うら");
  await page.getByRole("button", { name: C.next }).click();
  await answer(page, "うか");
  await expect(page.getByRole("status")).toHaveText(C.correct);
});

test("仕様 05 §4.4 B-01 B-02 決まり字変化を考慮する ON では変化した決まり字が正解。限定しても変化しない", async ({
  page,
}) => {
  await setUp(page, { poems: [74, 65], count: 2 });
  await answer(page, "うら");
  await page.getByRole("button", { name: C.next }).click();
  await answer(page, "うか");
  await expect(page.getByRole("status")).toHaveText(C.wrong("う"));
  await page.getByRole("button", { name: C.restart }).click();
  await expect(progress(page, 0, 2)).toBeVisible();
});

test("仕様 05 §4.4 B-02 1首だけに限定しても、まだ出ていない歌で決まり字は変わらない", async ({
  page,
}) => {
  await setUp(page, { poems: [74], count: 1 });
  await answer(page, "うか");
  await expect(page.getByRole("status")).toHaveText(C.correct);
});

test("仕様 05 §5 自動で次へ進む ON では、待機時間の後に次の問になる", async ({
  page,
}) => {
  await setUp(page, {
    poems: [87, 18, 57],
    count: 3,
    autoNext: true,
    waitMs: 300,
  });
  await answer(page, "す");
  await expect(page.getByRole("status")).toHaveText(C.correct);
  await expect(card(page, 57)).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("");
});

test("仕様 05 §3.3 逆さまの札は、180 度回って見える", async ({ page }) => {
  await setUp(page, { poems: [87, 18, 57], count: 3, upsideDown: true });
  await expect(card(page, 18)).toHaveCSS(
    "transform",
    "matrix(-1, 0, 0, -1, 0, 0)",
  );
});

test("仕様 05 §8 一覧の状態と、出題順の並び", async ({ page }) => {
  await setUp(page, { poems: [74, 65, 87], count: 3 });
  await page.getByRole("button", { name: C.openList }).click();
  const list = page.getByRole("region", { name: C.list });
  const row = (poem: number) =>
    list
      .getByRole("listitem")
      .filter({ hasText: C.row(poem, KIMARIJI[poem] ?? "") });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(row(74)).toContainText(C.status("unread", false, false));
  const first = await page.getByRole("img").getAttribute("aria-label");
  const firstPoem = first === C.card(65) ? 65 : first === C.card(74) ? 74 : 87;
  await answer(page, KIMARIJI[firstPoem] ?? "");
  await expect(row(firstPoem)).toContainText(C.status("correct", false, true));
  await list.getByRole("button", { name: C.byAsked }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await list.getByRole("button", { name: C.byKimariji }).click();
  await expect(list.getByRole("listitem")).toHaveCount(3);
});
