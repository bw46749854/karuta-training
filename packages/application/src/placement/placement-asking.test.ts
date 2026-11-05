import { expect, test } from "vitest";
import { runSession } from "../practice/runner";
import { FakeTime } from "../test-support/fake-time";
import {
  faceUp,
  group,
  idOf,
  individual,
  inputOf,
  play,
  start,
} from "../test-support/placement";
import { PLACEMENT, type PlacementCommand } from "./placement";

const P = PLACEMENT;

test("仕様 07 §5.1 §5.2 出題を始めると札をすべて裏にし、問を出す。一覧と入れ替えは使えない", () => {
  const state = play(inputOf(), [start(individual(39), group("あさぼ"))]);
  const view = P.view(state);
  expect(faceUp(state)).toEqual([
    [0, false],
    [64, false],
    [65, false],
  ]);
  expect(view.question).toBe("あさじ");
  expect(view.progress).toEqual({ finished: 0, total: 2 });
  expect(view.actions).toEqual({
    flip: false,
    select: true,
    invert: false,
    redeal: false,
    start: false,
    answer: true,
    skip: true,
    next: false,
    end: true,
  });
});

test("仕様 07 §5.3 §5.4 §5.5 マスを選んで答える。選んだマスが正解のマスとちょうど同じなら正解", () => {
  const input = inputOf();
  const asking = [start(individual(39), group("あさぼ"))];
  const select = (cell: number): PlacementCommand => ({
    kind: "flip-cell",
    cell,
  });
  const answer: PlacementCommand = { kind: "answer" };
  expect(
    P.view(play(input, [...asking, select(64), answer])).judgement,
  ).toEqual({ correct: true });
  expect(P.view(play(input, [...asking, select(0), answer])).judgement).toEqual(
    {
      correct: false,
    },
  );
  expect(
    P.view(play(input, [...asking, select(64), select(0), answer])).judgement,
  ).toEqual({ correct: false });
  expect(
    P.view(play(input, [...asking, select(64), select(64), answer])).judgement,
  ).toEqual({ correct: false });
  const selected = P.view(play(input, [...asking, select(64)])).cells[64];
  expect(selected?.selected).toBe(true);
  // A group: every card of it on the board.
  const groupFirst = [start(group("あさぼ"))];
  expect(
    P.view(play(input, [...groupFirst, select(0), select(65), answer]))
      .judgement,
  ).toEqual({ correct: true });
  expect(
    P.view(play(input, [...groupFirst, select(0), answer])).judgement,
  ).toEqual({ correct: false });
  // A poem not on the board: choosing nothing is right.
  expect(
    P.view(play(input, [start(individual(87)), answer])).judgement,
  ).toEqual({ correct: true });
});

test("仕様 07 §5.6 B-11 正解札の表示と札の確認の許可は、別々に効く", () => {
  const wrongAnswer = [start(individual(39)), { kind: "answer" } as const];
  const shown = play(
    inputOf({ showAnswer: "always", allowCheck: "never" }),
    wrongAnswer,
  );
  expect(faceUp(shown)).toEqual([
    [0, false],
    [64, true],
    [65, false],
  ]);
  expect(P.view(shown).actions.flip).toBe(false);
  expect(
    P.update(shown, {
      kind: "command",
      command: { kind: "flip-cell", cell: 0 },
      at: 0,
    }).state,
  ).toBe(shown);
  const checking = play(
    inputOf({ showAnswer: "never", allowCheck: "always" }),
    wrongAnswer,
  );
  expect(faceUp(checking).every(([, up]) => up === false)).toBe(true);
  expect(P.view(checking).actions.flip).toBe(true);
  expect(
    faceUp(
      P.update(checking, {
        kind: "command",
        command: { kind: "flip-cell", cell: 0 },
        at: 0,
      }).state,
    )[0],
  ).toEqual([0, true]);
  for (const [setting, correct, expected] of [
    ["when-correct", true, true],
    ["when-correct", false, false],
    ["when-wrong", true, false],
    ["when-wrong", false, true],
    ["never", true, false],
  ] as const) {
    const state = play(inputOf({ showAnswer: setting }), [
      start(individual(39)),
      ...(correct ? [{ kind: "flip-cell", cell: 64 } as const] : []),
      { kind: "answer" },
    ]);
    expect(faceUp(state)[1]).toEqual([64, expected]);
  }
});

test("仕様 07 §5.7 §5.8 スキップと次へ。次の問では札を裏に戻し、選んだマスを消す", () => {
  const input = inputOf({ showAnswer: "always" });
  const second = play(input, [
    start(individual(39), individual(31)),
    { kind: "flip-cell", cell: 64 },
    { kind: "answer" },
    { kind: "next" },
  ]);
  expect(P.view(second).question).toBe("あさぼらけあ");
  expect(P.view(second).progress).toEqual({ finished: 1, total: 2 });
  expect(faceUp(second).every(([, up]) => up === false)).toBe(true);
  expect(P.view(second).cells.some((cell) => cell.selected)).toBe(false);
  const skipped = play(input, [
    start(individual(39), individual(31)),
    { kind: "flip-cell", cell: 0 },
    { kind: "skip" },
  ]);
  expect(P.view(skipped).progress).toEqual({ finished: 1, total: 2 });
  expect(P.view(skipped).cells.some((cell) => cell.selected)).toBe(false);
});

test("仕様 07 §5.9 §5.10 全部終わると知らせて覚える時間に戻る。出題を終えると、いつでも戻る", () => {
  const input = inputOf();
  const done = play(input, [start(individual(39)), { kind: "skip" }]);
  expect(P.view(done).notice).toBe("all-asked");
  expect(P.view(done).actions.start).toBe(true);
  expect(faceUp(done).every(([, up]) => up)).toBe(true);
  const ended = play(input, [
    start(individual(39), individual(31)),
    { kind: "end" },
  ]);
  expect(P.view(ended).notice).toBeNull();
  expect(P.view(ended).question).toBeNull();
  expect(faceUp(ended).every(([, up]) => up)).toBe(true);
  expect(P.view(play(input, [start()])).notice).toBe("all-asked");
  const endedAfterJudging = play(input, [
    start(individual(39), individual(31)),
    { kind: "answer" },
    { kind: "end" },
  ]);
  expect(P.view(endedAfterJudging).actions.start).toBe(true);
  expect(faceUp(endedAfterJudging).every(([, up]) => up)).toBe(true);
});

test("仕様 07 §5.9 終わりの知らせは、覚える時間の次の操作で消す", () => {
  const input = inputOf();
  const done = [start(individual(39)), { kind: "skip" } as const];
  for (const command of [
    { kind: "flip-cell", cell: 0 },
    { kind: "flip-poem", poem: idOf(39) },
    { kind: "flip-group", name: "あさ" },
    { kind: "invert" },
  ] as const) {
    expect(P.view(play(input, [...done, command])).notice).toBeNull();
  }
});

test("ADR-0004 §2 その段階で意味のない操作は、何も変えない", () => {
  const input = inputOf();
  const memorizing = play(input, []);
  for (const command of [
    { kind: "answer" },
    { kind: "skip" },
    { kind: "next" },
    { kind: "end" },
    { kind: "flip-group", name: "ん" },
    { kind: "flip-cell", cell: 66 },
  ] as const) {
    expect(
      P.update(memorizing, { kind: "command", command, at: 0 }).state,
    ).toBe(memorizing);
  }
  const asking = play(input, [start(individual(39))]);
  for (const command of [
    { kind: "invert" },
    { kind: "next" },
    start(individual(31)),
    { kind: "flip-poem", poem: idOf(39) },
    { kind: "flip-group", name: "あさ" },
  ] as const) {
    expect(P.update(asking, { kind: "command", command, at: 0 }).state).toBe(
      asking,
    );
  }
});

test("仕様 07 §5.7 B-12 自動で次へ進む ON では待機時間の後に次の問になり、今の問のものでない予約は無視する", () => {
  const time = new FakeTime();
  const session = runSession(P, inputOf({ autoNext: true, waitMs: 300 }), {
    clock: time,
    scheduler: time,
  });
  session.dispatch(start(individual(39), individual(31), individual(64)));
  session.dispatch({ kind: "answer" });
  time.advance(299);
  expect(session.view().question).toBe("あさじ");
  time.advance(1);
  expect(session.view().question).toBe("あさぼらけあ");
  session.dispatch({ kind: "answer" });
  session.dispatch({ kind: "next" });
  expect(time.pending).toBe(0);
  const judged = play(inputOf({ autoNext: true }), [
    start(individual(39), individual(31)),
    { kind: "answer" },
  ]);
  expect(
    P.update(judged, {
      kind: "timer",
      event: { kind: "auto-next", question: 1 },
      at: 0,
    }).state,
  ).toBe(judged);
});

test("ADR-0004 §2 判定の後に意味のない操作は、何も変えない", () => {
  const judged = play(inputOf(), [start(individual(39)), { kind: "answer" }]);
  for (const command of [
    { kind: "invert" },
    { kind: "answer" },
    { kind: "skip" },
    start(individual(31)),
  ] as const) {
    expect(P.update(judged, { kind: "command", command, at: 0 }).state).toBe(
      judged,
    );
  }
});

test("仕様 07 §5.4 札のないマスは選べない", () => {
  const asking = play(inputOf(), [start(individual(39))]);
  expect(
    P.update(asking, {
      kind: "command",
      command: { kind: "flip-cell", cell: 1 },
      at: 0,
    }).state,
  ).toBe(asking);
});
