import { boardShape } from "@karuta/domain";
import { expect, test } from "vitest";
import { DEFAULT_SETTINGS } from "../settings/definition";
import { faceUp, idOf, inputOf, play } from "../test-support/placement";
import {
  placementInput,
  placementInputOn,
  placementQuestionsFor,
} from "./input";
import { PLACEMENT } from "./placement";

const P = PLACEMENT;

test("仕様 07 §2 §3 §4 開くと覚える時間で、札はすべて表。一覧は場にある札とグループだけ", () => {
  const view = P.view(play(inputOf(), []));
  expect(view.cells).toHaveLength(66);
  expect(view.cells[0]).toEqual({
    index: 0,
    row: 1,
    column: 1,
    side: "opponent",
    poem: 31,
    faceUp: true,
    selected: false,
  });
  expect(view.cells[65]?.side).toBe("own");
  expect(view.poems.map((poem) => poem.id)).toEqual([39, 31, 64]);
  expect(view.groups.map((row) => row.name)).toEqual(["あ", "あさ", "あさぼ"]);
  expect(view.question).toBeNull();
  expect(view.progress).toBeNull();
  expect(view.actions).toEqual({
    flip: true,
    select: false,
    invert: true,
    redeal: true,
    start: true,
    answer: false,
    skip: false,
    next: false,
    end: false,
  });
});

test("仕様 07 §4 札と個別の一覧で裏返し、個別の一覧は裏の札を選んだ表示にする", () => {
  const input = inputOf();
  expect(faceUp(play(input, [{ kind: "flip-cell", cell: 0 }]))).toEqual([
    [0, false],
    [64, true],
    [65, true],
  ]);
  expect(
    P.view(play(input, [{ kind: "flip-cell", cell: 0 }])).poems.map(
      (poem) => poem.selected,
    ),
  ).toEqual([false, true, false]);
  expect(faceUp(play(input, [{ kind: "flip-poem", poem: idOf(39) }]))).toEqual([
    [0, true],
    [64, false],
    [65, true],
  ]);
});

test("仕様 07 §4 グループで裏返し、すべて裏ならすべて表に戻す。表と裏を入れ替える。札のないマスは何もしない", () => {
  const input = inputOf();
  const asabo = play(input, [{ kind: "flip-group", name: "あさぼ" }]);
  expect(faceUp(asabo)).toEqual([
    [0, false],
    [64, true],
    [65, false],
  ]);
  expect(
    P.view(asabo)
      .groups.filter((row) => row.selected)
      .map((row) => row.name),
  ).toEqual(["あさぼ"]);
  expect(
    faceUp(
      play(input, [
        { kind: "flip-group", name: "あさぼ" },
        { kind: "flip-group", name: "あさぼ" },
      ]),
    ),
  ).toEqual([
    [0, true],
    [64, true],
    [65, true],
  ]);
  expect(
    faceUp(play(input, [{ kind: "flip-cell", cell: 0 }, { kind: "invert" }])),
  ).toEqual([
    [0, true],
    [64, false],
    [65, false],
  ]);
  const before = play(input, []);
  expect(
    P.update(before, {
      kind: "command",
      command: { kind: "flip-cell", cell: 1 },
      at: 0,
    }).state,
  ).toBe(before);
});

test("仕様 07 §2.5 仕様 03 §6 §7 設定の、その形の札の配置に配り、出題の範囲と出題モードで問を作る", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    common: {
      ...DEFAULT_SETTINGS.common,
      selected: [idOf(39), idOf(31), idOf(64)],
    },
    placement: { ...DEFAULT_SETTINGS.placement, mode: "individual" as const },
  };
  const input = placementInput(settings, boardShape(4, 9), () => 0);
  expect(input.board.shape).toEqual({ rows: 4, columns: 9 });
  expect(input.board.cells.filter((poem) => poem !== null)).toHaveLength(3);
  expect(input.mode).toBe("individual");
  const questions = placementQuestionsFor(input, () => 0);
  expect(questions).toHaveLength(3);
  expect(questions.every((question) => question.kind === "individual")).toBe(
    true,
  );
});

test("仕様 07 §4 場にない札や、場にない札だけのグループは、裏返さない", () => {
  const state = play(inputOf(), []);
  for (const command of [
    { kind: "flip-poem", poem: idOf(87) },
    { kind: "flip-group", name: "あき" },
  ] as const) {
    expect(P.update(state, { kind: "command", command, at: 0 }).state).toEqual(
      state,
    );
  }
});

test("仕様 08 §7.5 実践練習から戻ったときは、保存した盤面のまま始める", () => {
  const board = inputOf().board;
  const input = placementInputOn(DEFAULT_SETTINGS, board);
  expect(input.board).toBe(board);
  expect(input.mode).toBe(DEFAULT_SETTINGS.placement.mode);
  expect(P.view(play(input, [])).actions.start).toBe(true);
});
