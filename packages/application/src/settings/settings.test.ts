import { BOARD_SHAPES, defaultLayout, POEMS } from "@karuta/domain";
import fc from "fast-check";
import { expect, test } from "vitest";
import { MemoryRepository } from "../test-support/memory-repository";
import { DEFAULT_SETTINGS, SETTINGS, type Settings } from "./definition";
import {
  loadSettings,
  readSettingsDocument,
  saveSettings,
  settingsDocument,
  SETTINGS_VERSION,
} from "./document";
import { layoutFor, type LayoutsByShape } from "./items";

const ALL = POEMS.map((poem) => poem.id);

const usedOf = (length: number) =>
  fc.array(fc.boolean(), { minLength: length, maxLength: length });
const columnsOf = (rows: number) =>
  fc.record({
    11: usedOf(rows * 11),
    10: usedOf(rows * 10),
    9: usedOf(rows * 9),
    8: usedOf(rows * 8),
  });
const layouts: fc.Arbitrary<LayoutsByShape> = fc.record({
  6: columnsOf(6),
  4: columnsOf(4),
});
const orientation = fc.constantFrom("random", "upright", "upside-down");
const afterAnswer = fc.constantFrom(
  "always",
  "never",
  "when-correct",
  "when-wrong",
);
const ms = fc.integer({ min: 1, max: 9999 });
const count = fc.integer({ min: 1, max: 100 });
const anySettings: fc.Arbitrary<Settings> = fc.record({
  common: fc.record({
    limited: fc.boolean(),
    selected: fc.shuffledSubarray(ALL),
    layouts,
  }),
  cardFlow: fc.record({
    orientation,
    romajiAllowed: fc.boolean(),
    kimarijiChange: fc.boolean(),
    autoNext: fc.boolean(),
    waitMs: ms,
    count,
  }),
  multiple: fc.record({
    orientation,
    romajiAllowed: fc.boolean(),
    kimarijiChange: fc.boolean(),
    autoNext: fc.boolean(),
    waitMs: ms,
    count,
    perQuestion: fc.integer({ min: 2, max: 6 }),
    displayMs: ms,
  }),
  placement: fc.record({
    mode: fc.constantFrom("mixed", "individual", "group"),
    excludeDead: fc.boolean(),
    showAnswer: afterAnswer,
    allowCheck: afterAnswer,
    autoNext: fc.boolean(),
    waitMs: ms,
  }),
  play: fc.record({
    excludeDead: fc.boolean(),
    letterIntervalMs: ms,
    autoNext: fc.boolean(),
    waitMs: ms,
  }),
});

test("ADR-0003 §4 初期値：限定は ON、選んだ歌はなし、札の配置はどの形も初期の配置。初期値は検証を通る", () => {
  expect(SETTINGS.read(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  expect(DEFAULT_SETTINGS.common.limited).toBe(true);
  expect(DEFAULT_SETTINGS.common.selected).toEqual([]);
  for (const shape of BOARD_SHAPES) {
    expect(layoutFor(DEFAULT_SETTINGS.common.layouts, shape)).toEqual(
      defaultLayout(shape),
    );
  }
});

test("ADR-0003 §4 一度も保存していないとき、壊れた文書のときは、すべて初期値", () => {
  for (const document of [undefined, null, "x", 3, [], { settings: 5 }]) {
    expect(readSettingsDocument(document)).toEqual(DEFAULT_SETTINGS);
  }
});

test("ADR-0003 §4 ない項目と正しくない項目だけを初期値で補い、ほかの項目は保つ", () => {
  const document = {
    version: SETTINGS_VERSION,
    settings: { common: { limited: false, selected: [0], unknown: 1 } },
  };
  expect(readSettingsDocument(document)).toEqual({
    ...DEFAULT_SETTINGS,
    common: { ...DEFAULT_SETTINGS.common, limited: false },
  });
});

test("ADR-0003 §5 保存する文書は版の番号を持つ", () => {
  expect(settingsDocument(DEFAULT_SETTINGS)).toEqual({
    version: 1,
    settings: DEFAULT_SETTINGS,
  });
});

test("ADR-0003 §4 §5 保存した文書を読むと、どの設定も元に戻る（JSON を通しても）", () => {
  fc.assert(
    fc.property(anySettings, (settings) => {
      const saved: unknown = JSON.parse(
        JSON.stringify(settingsDocument(settings)),
      );
      expect(readSettingsDocument(saved)).toEqual(settings);
    }),
  );
});

test("ADR-0003 §5 保存先から読み、保存先へ保存する", async () => {
  const repository = new MemoryRepository();
  expect(await loadSettings(repository)).toEqual(DEFAULT_SETTINGS);
  const changed: Settings = {
    ...DEFAULT_SETTINGS,
    common: { ...DEFAULT_SETTINGS.common, limited: false },
  };
  expect(await saveSettings(repository, changed)).toBe("saved");
  expect(await loadSettings(repository)).toEqual(changed);
  repository.failSaves = true;
  expect(await saveSettings(repository, DEFAULT_SETTINGS)).toBe("failed");
  expect(await loadSettings(repository)).toEqual(changed);
});

test("仕様 04 §5 初期値は、取扱説明書の各表の「設定画面の初期値」（B-26）", () => {
  const { cardFlow, multiple, placement, play } = DEFAULT_SETTINGS;
  expect({ cardFlow, multiple, placement, play }).toEqual({
    cardFlow: {
      orientation: "random",
      romajiAllowed: true,
      kimarijiChange: true,
      autoNext: false,
      waitMs: 500,
      count: 100,
    },
    multiple: {
      orientation: "random",
      romajiAllowed: true,
      kimarijiChange: false,
      autoNext: false,
      waitMs: 500,
      count: 100,
      perQuestion: 5,
      displayMs: 500,
    },
    placement: {
      mode: "group",
      excludeDead: true,
      showAnswer: "when-correct",
      allowCheck: "when-correct",
      autoNext: false,
      waitMs: 500,
    },
    play: {
      excludeDead: true,
      letterIntervalMs: 500,
      autoNext: false,
      waitMs: 500,
    },
  });
});
