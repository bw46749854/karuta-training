import { WORDING } from "@karuta/ui";
import { expect, test, type Page } from "@playwright/test";

const S = WORDING.settings;

async function openSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: WORDING.top.open.settings }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: S.title }),
  ).toBeVisible();
}

async function backToTop(page: Page): Promise<void> {
  await page.getByRole("button", { name: WORDING.common.backToTop }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: WORDING.top.title }),
  ).toBeVisible();
}

const region = (page: Page, name: string) =>
  page.getByRole("region", { name, exact: true });

const limited = (page: Page) =>
  region(page, S.sections.common).getByRole("checkbox", {
    name: S.items["common.limited"],
  });

const cardFlowOrientation = (page: Page) =>
  region(page, S.sections.cardFlow).getByRole("combobox", {
    name: S.items["cardFlow.orientation"],
  });

const cardFlowWait = (page: Page) =>
  region(page, S.sections.cardFlow).getByRole("spinbutton", {
    name: S.items["cardFlow.waitMs"],
  });

const shapeSelect = (page: Page) =>
  region(page, S.sections.layouts).getByRole("combobox", { name: S.shape });

const cell = (page: Page, row: number, column: number) =>
  region(page, S.sections.layouts).getByRole("checkbox", {
    name: S.cell(row, column),
    exact: true,
  });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("仕様 04 §2 §3 トップから設定を開き、トップへ戻る。ブラウザの「戻る」でも戻る", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { level: 1, name: WORDING.top.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: WORDING.common.backToTop }),
  ).toHaveCount(0);
  await openSettings(page);
  await backToTop(page);
  await openSettings(page);
  await page.goBack();
  await expect(
    page.getByRole("heading", { level: 1, name: WORDING.top.title }),
  ).toBeVisible();
});

test("仕様 04 §5 §8.6 B-26 B-27 初めて開くと、すべて初期値", async ({
  page,
}) => {
  await openSettings(page);
  await expect(limited(page)).toBeChecked();
  await expect(cardFlowOrientation(page).locator("option:checked")).toHaveText(
    S.options.random,
  );
  await expect(cardFlowWait(page)).toHaveValue("500");
  await expect(
    region(page, S.sections.multiple).getByRole("spinbutton", {
      name: S.items["multiple.perQuestion"],
    }),
  ).toHaveValue("5");
  await expect(
    region(page, S.sections.placement)
      .getByRole("combobox", { name: S.items["placement.showAnswer"] })
      .locator("option:checked"),
  ).toHaveText(S.options["when-correct"]);
  await expect(shapeSelect(page).locator("option:checked")).toHaveText(
    S.shapeName(6, 11),
  );
  const layouts = region(page, S.sections.layouts);
  await expect(layouts.getByRole("checkbox")).toHaveCount(66);
  await expect(layouts.getByRole("checkbox", { checked: true })).toHaveCount(
    50,
  );
  await expect(cell(page, 1, 6)).not.toBeChecked();
  await expect(cell(page, 1, 5)).toBeChecked();
  await expect(cell(page, 6, 6)).not.toBeChecked();
  await expect(cell(page, 6, 7)).toBeChecked();
});

test("仕様 04 §9.1 §9.5 B-17 項目を変えて保存すると、開き直しても残る", async ({
  page,
}) => {
  await openSettings(page);
  await limited(page).uncheck();
  await cardFlowOrientation(page).selectOption({
    label: S.options["upside-down"],
  });
  await cardFlowWait(page).fill("1200");
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);

  const expectSaved = async () => {
    await expect(limited(page)).not.toBeChecked();
    await expect(
      cardFlowOrientation(page).locator("option:checked"),
    ).toHaveText(S.options["upside-down"]);
    await expect(cardFlowWait(page)).toHaveValue("1200");
  };
  await backToTop(page);
  await openSettings(page);
  await expectSaved();
  await page.reload();
  await expectSaved();
});

test("仕様 04 §9.2 §9.4 保存せずにトップへ戻ると、変更は捨てられる", async ({
  page,
}) => {
  await openSettings(page);
  await limited(page).uncheck();
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);
  await limited(page).check();
  await expect(page.getByRole("status")).toHaveText("");
  await backToTop(page);
  await openSettings(page);
  await expect(limited(page)).not.toBeChecked();
});

test("仕様 04 §9.3 初期値に戻しても、保存はされない", async ({ page }) => {
  await openSettings(page);
  await cardFlowWait(page).fill("800");
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);
  await page.getByRole("button", { name: S.reset }).click();
  await expect(cardFlowWait(page)).toHaveValue("500");
  await backToTop(page);
  await openSettings(page);
  await expect(cardFlowWait(page)).toHaveValue("800");
});

test("仕様 04 §6 グループで歌を選び、外す", async ({ page }) => {
  await openSettings(page);
  const groups = region(page, S.groups);
  const poems = region(page, S.poems);
  const pressed = (list: typeof groups, name: string) =>
    list.getByRole("button", { name, exact: true, pressed: true });
  await groups.getByRole("button", { name: "あさ", exact: true }).click();
  await expect(pressed(groups, "あさ")).toBeVisible();
  await expect(pressed(groups, "あさぼ")).toBeVisible();
  for (const poem of [S.poem(39, "あさじ"), S.poem(31, "あさぼらけあ")]) {
    await expect(pressed(poems, poem)).toBeVisible();
  }
  await poems.getByRole("button", { name: S.poem(39, "あさじ") }).click();
  await expect(pressed(groups, "あさ")).toHaveCount(0);
  await expect(pressed(groups, "あさぼ")).toBeVisible();
  await groups.getByRole("button", { name: "あさぼ", exact: true }).click();
  await expect(poems.getByRole("button", { pressed: true })).toHaveCount(0);
  await page.getByRole("button", { name: S.selectAll }).click();
  await expect(poems.getByRole("button", { pressed: true })).toHaveCount(100);
  await page.getByRole("button", { name: S.clearAll }).click();
  await expect(poems.getByRole("button", { pressed: true })).toHaveCount(0);
});

test("仕様 04 §7 範囲の外の数や整数でない数では、保存できない", async ({
  page,
}) => {
  await openSettings(page);
  const save = page.getByRole("button", { name: S.save });
  const message = region(page, S.sections.cardFlow).getByText(
    S.integerRange(1, 9999),
  );
  for (const input of ["0", "10000", "1.5", ""]) {
    await cardFlowWait(page).fill(input);
    await expect(message).toBeVisible();
    await expect(save).toBeDisabled();
  }
  await cardFlowWait(page).fill("700");
  await expect(message).toHaveCount(0);
  await expect(save).toBeEnabled();
});

test("仕様 04 §8 形を切り替えて配置を変え、保存する", async ({ page }) => {
  await openSettings(page);
  const layouts = region(page, S.sections.layouts);
  await shapeSelect(page).selectOption({ label: S.shapeName(4, 9) });
  await expect(layouts.getByRole("checkbox")).toHaveCount(36);
  await expect(layouts.getByRole("checkbox", { checked: true })).toHaveCount(
    34,
  );
  await cell(page, 1, 1).uncheck();
  await shapeSelect(page).selectOption({ label: S.shapeName(6, 11) });
  await expect(layouts.getByRole("checkbox", { checked: true })).toHaveCount(
    50,
  );
  await shapeSelect(page).selectOption({ label: S.shapeName(4, 9) });
  await expect(cell(page, 1, 1)).not.toBeChecked();
  await page.getByRole("button", { name: S.save }).click();
  await expect(page.getByRole("status")).toHaveText(S.saved);
  await page.reload();
  await shapeSelect(page).selectOption({ label: S.shapeName(4, 9) });
  await expect(cell(page, 1, 1)).not.toBeChecked();
  await expect(layouts.getByRole("checkbox", { checked: true })).toHaveCount(
    33,
  );
});
