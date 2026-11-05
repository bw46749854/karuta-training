// @vitest-environment jsdom
import {
  DEFAULT_SETTINGS,
  settingsForm,
  startEditing,
  type SettingsRepository,
} from "@karuta/application";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { SettingsScreen } from "./settings-screen";
import { WORDING } from "./wording";

const S = WORDING.settings;

afterEach(cleanup);

function memory(): SettingsRepository & { readonly document: unknown } {
  let saved: unknown;
  return {
    get document() {
      return saved;
    },
    load: () => Promise.resolve(saved),
    save: (document: unknown) => {
      saved = document;
      return Promise.resolve("saved");
    },
  };
}

const FIELDS = settingsForm(startEditing(DEFAULT_SETTINGS));

const wordsOf = (table: Readonly<Record<string, string>>, name: string) =>
  Object.entries(table).find(([key]) => key === name)?.[1];

test("ADR-0003 仕様 04 §10 定義のすべての項目に、文言と入力欄がある", async () => {
  render(<SettingsScreen repository={memory()} onBackToTop={vi.fn()} />);
  for (const section of FIELDS) {
    const title = wordsOf(S.sections, section.name);
    expect(title).toBeDefined();
    const region = await screen.findByRole("region", { name: title ?? "" });
    for (const field of section.fields) {
      const label = wordsOf(S.items, field.path);
      expect(label, field.path).toBeDefined();
      expect(within(region).getByLabelText(label ?? "")).toBeTruthy();
    }
  }
  const options = FIELDS.flatMap((section) => section.fields).flatMap(
    (field) => (field.kind === "choice" ? field.options : []),
  );
  for (const option of options) {
    expect(wordsOf(S.options, option), option).toBeDefined();
  }
  const paths = FIELDS.flatMap((section) => section.fields).map(
    (field) => field.path,
  );
  expect(Object.keys(S.items).sort()).toEqual([...paths].sort());
});

test("仕様 04 §9.1 §9.2 保存できたら知らせ、その後に項目を変えるとメッセージを消す", async () => {
  const repository = memory();
  render(<SettingsScreen repository={repository} onBackToTop={vi.fn()} />);
  const limited = await screen.findByRole("checkbox", {
    name: S.items["common.limited"],
  });
  await userEvent.click(limited);
  await userEvent.click(screen.getByRole("button", { name: S.save }));
  expect(screen.getByRole("status").textContent).toBe(S.saved);
  expect(repository.document).toMatchObject({
    settings: { common: { limited: false } },
  });
  await userEvent.click(limited);
  expect(screen.getByRole("status").textContent).toBe("");
});

test("仕様 04 §9.1 保存できなかったら知らせ、下書きは残す", async () => {
  const repository: SettingsRepository = {
    load: () => Promise.resolve(undefined),
    save: () => Promise.resolve("failed"),
  };
  render(<SettingsScreen repository={repository} onBackToTop={vi.fn()} />);
  const limited = await screen.findByRole("checkbox", {
    name: S.items["common.limited"],
  });
  await userEvent.click(limited);
  await userEvent.click(screen.getByRole("button", { name: S.save }));
  expect(screen.getByRole("status").textContent).toBe(S.saveFailed);
  expect(
    screen.getByRole<HTMLInputElement>("checkbox", {
      name: S.items["common.limited"],
    }).checked,
  ).toBe(false);
});
