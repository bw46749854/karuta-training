import { PREFIX_GROUPS, POEMS } from "@karuta/domain";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "./definition";
import { editField, startEditing, toggleGroup } from "./editor";
import { poemSelection, settingsForm } from "./form";

test("仕様 04 §4.2 §10 入力欄は、まとまりごとに定義の順に並ぶ。歌と札の配置は専用の部品で作るので含まない", () => {
  const form = settingsForm(startEditing(DEFAULT_SETTINGS));
  expect(form.map((section) => section.name)).toEqual([
    "common",
    "cardFlow",
    "multiple",
    "placement",
    "play",
  ]);
  expect(
    form.map((section) => section.fields.map((field) => field.path)),
  ).toEqual([
    ["common.limited"],
    [
      "cardFlow.orientation",
      "cardFlow.romajiAllowed",
      "cardFlow.kimarijiChange",
      "cardFlow.autoNext",
      "cardFlow.waitMs",
      "cardFlow.count",
    ],
    [
      "multiple.orientation",
      "multiple.romajiAllowed",
      "multiple.kimarijiChange",
      "multiple.autoNext",
      "multiple.waitMs",
      "multiple.count",
      "multiple.perQuestion",
      "multiple.displayMs",
    ],
    [
      "placement.mode",
      "placement.excludeDead",
      "placement.showAnswer",
      "placement.allowCheck",
      "placement.autoNext",
      "placement.waitMs",
    ],
    [
      "play.excludeDead",
      "play.letterIntervalMs",
      "play.autoNext",
      "play.waitMs",
    ],
  ]);
});

test("仕様 04 §5 §7 入力欄は、下書きの値と、範囲・選択肢・受け付けない入力かどうかを持つ", () => {
  const editor = editField(
    editField(startEditing(DEFAULT_SETTINGS), "common.limited", false),
    "cardFlow.count",
    "0",
  );
  const fields = settingsForm(editor).flatMap((section) => section.fields);
  const fieldAt = (path: string) => fields.find((field) => field.path === path);
  expect(fieldAt("common.limited")).toEqual({
    kind: "flag",
    path: "common.limited",
    value: false,
  });
  expect(fieldAt("cardFlow.orientation")).toEqual({
    kind: "choice",
    path: "cardFlow.orientation",
    value: "random",
    options: ["random", "upright", "upside-down"],
  });
  expect(fieldAt("cardFlow.waitMs")).toEqual({
    kind: "integer",
    path: "cardFlow.waitMs",
    value: 500,
    min: 1,
    max: 9999,
    invalid: false,
  });
  expect(fieldAt("cardFlow.count")).toEqual({
    kind: "integer",
    path: "cardFlow.count",
    value: 100,
    min: 1,
    max: 100,
    invalid: true,
  });
  expect(fieldAt("placement.mode")).toMatchObject({
    options: ["mixed", "individual", "group"],
  });
  expect(fieldAt("placement.showAnswer")).toMatchObject({
    options: ["always", "never", "when-correct", "when-wrong"],
  });
});

test("仕様 04 §6.1 §6.3 §6.4 歌の一覧は決まり字表の順で、グループはすべての歌が選ばれているときだけ選んだ表示", () => {
  const asa = toggleGroup(startEditing(DEFAULT_SETTINGS), "あさ");
  const view = poemSelection(asa.draft);
  expect(view.groups.map((group) => group.name)).toEqual(
    PREFIX_GROUPS.map((group) => group.name),
  );
  expect(view.poems.map((poem) => [poem.id, poem.kimariji])).toEqual(
    POEMS.map((poem) => [poem.id, poem.staticKimariji]),
  );
  const selectedGroups = view.groups
    .filter((group) => group.selected)
    .map((group) => group.name);
  expect(selectedGroups).toEqual(["あさ", "あさぼ"]);
  expect(
    view.poems.filter((poem) => poem.selected).map((poem) => poem.id),
  ).toEqual([39, 31, 64]);
});
