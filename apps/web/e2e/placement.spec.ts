import { WORDING } from "@karuta/ui";
import { expect, test, type Page } from "@playwright/test";

const C = WORDING.cardFlow;
const P = WORDING.placement;
const S = WORDING.settings;

const KIMARIJI: Readonly<Record<number, string>> = {
  39: "あさじ",
  31: "あさぼらけあ",
  64: "あさぼらけう",
};

interface PlacementSettings {
  readonly mode?: "mixed" | "individual" | "group";
  readonly showAnswer?: keyof typeof S.options;
  readonly allowCheck?: keyof typeof S.options;
  readonly autoNext?: boolean;
  readonly waitMs?: number;
}

// A landscape screen whose board is 6 rows by 11 columns (spec 07 §2).
test.use({ viewport: { width: 1280, height: 720 } });

// ADR-0002 §5: Math.random gives 0 every time. Then あさじ (39),
// あさぼらけあ (31) and あさぼらけう (64) are dealt as 31 at row 1 column 1,
// 64 at row 6 column 11 and 39 at row 6 column 10, and the questions come
// as 31, 64, 39 (individual) or あさ, あさぼ, あ (group).
async function setUp(page: Page, settings: PlacementSettings): Promise<void> {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
  await page.getByRole("button", { name: WORDING.top.open.settings }).click();
  const poems = page.getByRole("region", { name: S.poems, exact: true });
  for (const poem of [39, 31, 64]) {
    await poems
      .getByRole("button", { name: S.poem(poem, KIMARIJI[poem] ?? "") })
      .click();
  }
  const section = page.getByRole("region", {
    name: S.sections.placement,
    exact: true,
  });
  const choose = (path: keyof typeof S.items, option: keyof typeof S.options) =>
    section
      .getByRole("combobox", { name: S.items[path] })
      .selectOption({ label: S.options[option] });
  await choose("placement.mode", settings.mode ?? "individual");
  await choose("placement.showAnswer", settings.showAnswer ?? "when-correct");
  await choose("placement.allowCheck", settings.allowCheck ?? "when-correct");
  await section
    .getByRole("checkbox", { name: S.items["placement.autoNext"] })
    .setChecked(settings.autoNext ?? false);
  await section
    .getByRole("spinbutton", { name: S.items["placement.waitMs"] })
    .fill(String(settings.waitMs ?? 500));
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);
  await page.getByRole("button", { name: WORDING.common.backToTop }).click();
  await page.getByRole("button", { name: WORDING.top.open.placement }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: P.title }),
  ).toBeVisible();
}

const up = (
  page: Page,
  [row, column, poem]: readonly [number, number, number],
) => page.getByRole("button", { name: P.cardCell(row, column, poem) });

const down = (page: Page, row: number, column: number) =>
  page.getByRole("button", { name: P.hiddenCell(row, column) });

const press = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();

test("仕様 07 §2 §3 開くと札の配置のとおりに配られ、相手陣の札は逆さまに見える", async ({
  page,
}) => {
  await setUp(page, {});
  await expect(up(page, [1, 1, 31])).toBeVisible();
  await expect(up(page, [6, 11, 64])).toBeVisible();
  await expect(up(page, [6, 10, 39])).toBeVisible();
  await expect(
    up(page, [1, 1, 31]).getByRole("img", { name: C.card(31) }),
  ).toHaveCSS("transform", "matrix(-1, 0, 0, -1, 0, 0)");
  await expect(
    up(page, [6, 11, 64]).getByRole("img", { name: C.card(64) }),
  ).toHaveCSS("transform", "none");
});

test("仕様 07 §4 B-13 札・一覧・グループで裏返し、表と裏を入れ替え、配り直すとすべて表になる", async ({
  page,
}) => {
  await setUp(page, {});
  const lists = page.getByRole("region", { name: S.poems, exact: true });
  await up(page, [1, 1, 31]).click();
  await expect(down(page, 1, 1)).toBeVisible();
  await expect(
    lists.getByRole("button", {
      name: S.poem(31, "あさぼらけあ"),
      pressed: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: S.groups, exact: true })
    .getByRole("button", { name: "あさぼ", exact: true })
    .click();
  await expect(down(page, 6, 11)).toBeVisible();
  await expect(up(page, [6, 10, 39])).toBeVisible();
  await press(page, P.invert);
  await expect(up(page, [1, 1, 31])).toBeVisible();
  await expect(down(page, 6, 10)).toBeVisible();
  await press(page, P.redeal);
  for (const [row, column, poem] of [
    [1, 1, 31],
    [6, 11, 64],
    [6, 10, 39],
  ] as const) {
    await expect(up(page, [row, column, poem])).toBeVisible();
  }
});

test("仕様 07 §5.3 B-10 個別の問で、何も選ばずに答えると、場にある札なので誤答", async ({
  page,
}) => {
  await setUp(page, {});
  await press(page, P.start);
  await expect(page.getByText(P.question("あさぼらけあ"))).toBeVisible();
  await expect(down(page, 1, 1)).toBeVisible();
  await press(page, C.answer);
  await expect(page.getByRole("status")).toHaveText(P.wrong);
});

test("仕様 07 §5.3 §5.5 グループの問で、場にあるそのグループの札をすべて選ぶと正解", async ({
  page,
}) => {
  await setUp(page, { mode: "group" });
  await press(page, P.start);
  await expect(page.getByText(P.question("あさ"))).toBeVisible();
  for (const [row, column] of [
    [1, 1],
    [6, 11],
    [6, 10],
  ] as const) {
    await down(page, row, column).click();
    await expect(
      page.getByRole("button", {
        name: P.hiddenCell(row, column),
        pressed: true,
      }),
    ).toBeVisible();
  }
  await press(page, C.answer);
  await expect(page.getByRole("status")).toHaveText(P.correct);
});

test("仕様 07 §5.6 B-11 正解札を表示しない・確認を許可するなら、答えた後に札を裏返して確かめられる", async ({
  page,
}) => {
  await setUp(page, { showAnswer: "never", allowCheck: "always" });
  await press(page, P.start);
  await press(page, C.answer);
  await expect(page.getByRole("status")).toHaveText(P.wrong);
  await expect(down(page, 1, 1)).toBeVisible();
  await down(page, 6, 11).click();
  await expect(up(page, [6, 11, 64])).toBeVisible();
});

test("仕様 07 §5.6 B-11 正解札を表示する・確認を許可しないなら、正解の札だけが表になり、ほかは裏返せない", async ({
  page,
}) => {
  await setUp(page, { showAnswer: "always", allowCheck: "never" });
  await press(page, P.start);
  await press(page, C.answer);
  await expect(up(page, [1, 1, 31])).toBeVisible();
  await expect(down(page, 6, 11)).toBeDisabled();
});

test("仕様 07 §5.7 B-12 自動で次へ進む ON では、待機時間の後に次の問になる", async ({
  page,
}) => {
  await setUp(page, { autoNext: true, waitMs: 300 });
  await press(page, P.start);
  await press(page, C.answer);
  await expect(page.getByRole("status")).toHaveText(P.wrong);
  await expect(page.getByText(P.question("あさぼらけう"))).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.getByText(C.progressText(1, 3))).toBeVisible();
});

test("仕様 07 §5.7 §5.9 §5.10 スキップを続けると終わって覚える時間に戻る。出題を終えると、いつでも戻る", async ({
  page,
}) => {
  await setUp(page, {});
  await press(page, P.start);
  for (let count = 0; count < 3; count += 1) {
    await press(page, C.skip);
  }
  await expect(page.getByRole("status")).toHaveText(P.allAsked);
  await expect(up(page, [1, 1, 31])).toBeVisible();
  await press(page, P.start);
  await expect(down(page, 1, 1)).toBeVisible();
  await press(page, P.end);
  await expect(up(page, [1, 1, 31])).toBeVisible();
  await expect(
    page.getByRole("button", { name: P.start, exact: true }),
  ).toBeEnabled();
});

test("仕様 07 §2.4 ADR-0007 §5 途中で縦向きにすると案内が出て、横向きに戻すと続きから練習できる", async ({
  page,
}) => {
  await setUp(page, {});
  await up(page, [1, 1, 31]).click();
  await press(page, P.start);
  await expect(page.getByText(P.question("あさぼらけあ"))).toBeVisible();
  await page.setViewportSize({ width: 720, height: 1280 });
  await expect(page.getByText(P.rotate)).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByText(P.question("あさぼらけあ"))).toBeVisible();
  await expect(down(page, 1, 1)).toBeVisible();
});

test.describe("縦向き", () => {
  test.use({ viewport: { width: 810, height: 1080 } });

  test("仕様 07 §2.2 縦向きでは、横向きにする案内を出す", async ({ page }) => {
    await page.goto("/#/placement");
    await expect(page.getByText(P.rotate)).toBeVisible();
    await expect(page.getByRole("button", { name: /段目/ })).toHaveCount(0);
  });
});

test.describe("盤面の入らない大きさ", () => {
  test.use({ viewport: { width: 560, height: 300 } });

  test("仕様 07 §2.3 4段×8列でも入らない画面では、使えないことを伝える", async ({
    page,
  }) => {
    await page.goto("/#/placement");
    await expect(page.getByText(P.tooSmall)).toBeVisible();
  });
});
