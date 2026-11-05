import { boardShape, POEMS } from "@karuta/domain";
import fc from "fast-check";
import { expect, test } from "vitest";
import { MemoryRepository } from "../test-support/memory-repository";
import { DEFAULT_SETTINGS } from "./definition";
import {
  loadSettings,
  readSettingsDocument,
  settingsDocument,
} from "./document";
import {
  canSave,
  clearPoems,
  discardDraft,
  editField,
  resetDraft,
  saveDraft,
  selectAllPoems,
  startEditing,
  toggleCell,
  toggleGroup,
  togglePoem,
  type SettingsEditor,
} from "./editor";
import { layoutFor } from "./items";

const idOf = (number: number) => {
  const poem = POEMS.find((candidate) => candidate.id === number);
  if (poem === undefined) {
    throw new RangeError(String(number));
  }
  return poem.id;
};

const fresh = () => startEditing(DEFAULT_SETTINGS);
const notLimited = () => editField(fresh(), "common.limited", false);

test("ADR-0003 §6 編集を始めると、下書きは保存済みの値で、受け付けない入力はない", () => {
  expect(fresh()).toEqual({
    saved: DEFAULT_SETTINGS,
    draft: DEFAULT_SETTINGS,
    invalid: [],
  });
});

test("仕様 04 §4.4 項目を変えると、下書きだけが変わる", () => {
  const editor = editField(
    editField(
      editField(fresh(), "common.limited", false),
      "cardFlow.orientation",
      "upside-down",
    ),
    "cardFlow.waitMs",
    "1200",
  );
  expect(editor.saved).toEqual(DEFAULT_SETTINGS);
  expect(editor.draft).toEqual({
    ...DEFAULT_SETTINGS,
    common: { ...DEFAULT_SETTINGS.common, limited: false },
    cardFlow: {
      ...DEFAULT_SETTINGS.cardFlow,
      orientation: "upside-down",
      waitMs: 1200,
    },
  });
  expect(canSave(editor)).toBe(true);
});

test("仕様 04 §7.1 半角の数字だけでできた、範囲の中の整数を受け付ける", () => {
  for (const [input, value] of [
    ["1", 1],
    ["9999", 9999],
    ["0500", 500],
  ] as const) {
    expect(editField(fresh(), "cardFlow.waitMs", input).draft.cardFlow).toEqual(
      { ...DEFAULT_SETTINGS.cardFlow, waitMs: value },
    );
  }
});

test("仕様 04 §7.1 §7.2 §7.3 受け付けない入力では下書きを変えず、保存できない", () => {
  for (const input of [
    "0",
    "10000",
    "",
    " 12",
    "12 ",
    "+12",
    "-1",
    "1.5",
    "1e3",
    "１２",
    "abc",
  ]) {
    const editor = editField(fresh(), "cardFlow.waitMs", input);
    expect(editor.draft).toEqual(DEFAULT_SETTINGS);
    expect(editor.invalid).toEqual(["cardFlow.waitMs"]);
    expect(canSave(editor)).toBe(false);
  }
});

test("仕様 04 §7.4 受け付ける入力に直すと、受け付けない入力でなくなる", () => {
  const editor = editField(
    editField(
      editField(fresh(), "cardFlow.waitMs", "0"),
      "cardFlow.count",
      "0",
    ),
    "cardFlow.waitMs",
    "700",
  );
  expect(editor.invalid).toEqual(["cardFlow.count"]);
  expect(editor.draft.cardFlow.waitMs).toBe(700);
  const fixed = editField(editor, "cardFlow.count", "100");
  expect(fixed.invalid).toEqual([]);
  expect(canSave(fixed)).toBe(true);
});

test("ADR-0003 §8 種類の合わない値と、定義にない項目では、下書きを変えない", () => {
  const editor = fresh();
  expect(editField(editor, "common.limited", "false")).toEqual(editor);
  expect(editField(editor, "cardFlow.orientation", "sideways")).toEqual(editor);
  expect(editField(editor, "cardFlow.orientation", true)).toEqual(editor);
  expect(editField(editor, "cardFlow.waitMs", true)).toEqual(editor);
  expect(() => editField(editor, "cardFlow.unknown", true)).toThrow(RangeError);
  expect(() => editField(editor, "common.selected", true)).toThrow(RangeError);
  for (const path of ["common", "unknown.limited", "common.limited.x"]) {
    expect(() => editField(editor, path, true)).toThrow(RangeError);
  }
});

test("仕様 04 §6.2 §6.3 グループを押すと、すべて選ぶか、すべて選ばれていればすべて外す", () => {
  const asa = toggleGroup(fresh(), "あさ");
  expect(asa.draft.common.selected).toEqual([39, 31, 64]);
  const withoutAsaji = togglePoem(asa, idOf(39));
  expect(withoutAsaji.draft.common.selected).toEqual([31, 64]);
  expect(toggleGroup(withoutAsaji, "あさ").draft.common.selected).toEqual([
    39, 31, 64,
  ]);
  expect(toggleGroup(withoutAsaji, "あさぼ").draft.common.selected).toEqual([]);
  expect(() => toggleGroup(fresh(), "ん")).toThrow(RangeError);
});

test("仕様 04 §6.4 §6.5 歌を1首ずつ選んで外し、すべて選び、すべて外す。並びは決まり字表の順", () => {
  const editor = togglePoem(togglePoem(fresh(), idOf(1)), idOf(87));
  expect(editor.draft.common.selected).toEqual([87, 1]);
  expect(togglePoem(editor, idOf(87)).draft.common.selected).toEqual([1]);
  expect(selectAllPoems(editor).draft.common.selected).toEqual(
    POEMS.map((poem) => poem.id),
  );
  expect(clearPoems(editor).draft.common.selected).toEqual([]);
});

test("仕様 04 §8.3 §8.5 マスを切り替えると、その形の配置だけが変わる", () => {
  const shape = boardShape(4, 9);
  const editor = toggleCell(fresh(), shape, 0);
  const before = layoutFor(DEFAULT_SETTINGS.common.layouts, shape).used;
  expect(layoutFor(editor.draft.common.layouts, shape).used).toEqual([
    !before[0],
    ...before.slice(1),
  ]);
  expect(editor.draft.common.layouts[6]).toEqual(
    DEFAULT_SETTINGS.common.layouts[6],
  );
  expect(toggleCell(editor, shape, 0).draft).toEqual(DEFAULT_SETTINGS);
  expect(() => toggleCell(editor, shape, 36)).toThrow(RangeError);
  expect(() => toggleCell(editor, shape, -1)).toThrow(RangeError);
});

test("ADR-0003 §8 どんな編集の後も、下書きは検証を通る値", () => {
  const edit = fc.oneof(
    fc.record({ path: fc.constant("common.limited"), input: fc.boolean() }),
    fc.record({
      path: fc.constantFrom("cardFlow.waitMs", "multiple.perQuestion"),
      input: fc.oneof(fc.string(), fc.nat({ max: 20000 }).map(String)),
    }),
    fc.record({
      path: fc.constant("placement.mode"),
      input: fc.constantFrom("mixed", "individual", "group", "other"),
    }),
  );
  fc.assert(
    fc.property(fc.array(edit, { maxLength: 20 }), (edits) => {
      const editor = edits.reduce<SettingsEditor>(
        (current, { path, input }) => editField(current, path, input),
        fresh(),
      );
      const saved: unknown = JSON.parse(
        JSON.stringify(settingsDocument(editor.draft)),
      );
      expect(readSettingsDocument(saved)).toEqual(editor.draft);
    }),
  );
});

test("ADR-0003 §6 取扱説明書 §6.4 初期値に戻すのは下書きだけで、受け付けない入力も消える", () => {
  const editor = editField(notLimited(), "cardFlow.waitMs", "0");
  const reset = resetDraft({ ...editor, saved: editor.draft });
  expect(reset).toEqual({
    saved: editor.draft,
    draft: DEFAULT_SETTINGS,
    invalid: [],
  });
});

test("ADR-0003 §6 取扱説明書 §6.4 破棄すると、下書きは保存済みの値に戻り、受け付けない入力も消える", () => {
  const editor = editField(notLimited(), "cardFlow.waitMs", "0");
  expect(discardDraft(editor)).toEqual(fresh());
});

test("ADR-0003 §6 保存すると、保存先に書き、保存済みの値が下書きになる", async () => {
  const repository = new MemoryRepository();
  const editing = notLimited();
  const { editor, result } = await saveDraft(editing, repository);
  expect(result).toBe("saved");
  expect(editor).toEqual(startEditing(editing.draft));
  expect(await loadSettings(repository)).toEqual(editing.draft);
});

test("ADR-0003 §6 保存に失敗したら、保存済みの値も下書きも変えない", async () => {
  const repository = new MemoryRepository();
  repository.failSaves = true;
  const editing = notLimited();
  const { editor, result } = await saveDraft(editing, repository);
  expect(result).toBe("failed");
  expect(editor).toEqual(editing);
});
