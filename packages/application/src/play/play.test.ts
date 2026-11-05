import { boardShape, POEMS, type Board, type PoemId } from "@karuta/domain";
import { expect, test } from "vitest";
import { runSession } from "../practice/runner";
import { DEFAULT_SETTINGS } from "../settings/definition";
import { FakeTime } from "../test-support/fake-time";
import { playInput } from "./input";
import { PLAY, type PlayInput } from "./play";

const idOf = (number: number): PoemId => {
  const poem = POEMS.find((candidate) => candidate.id === number);
  if (poem === undefined) {
    throw new RangeError(String(number));
  }
  return poem.id;
};

// あさぼらけあ (31) top left, あさぼらけう (64) bottom right, あさじ (39)
// next to it, うか (74) next to that.
function boardOf(cells: Readonly<Record<number, number>>): Board {
  return {
    shape: boardShape(6, 11),
    cells: Array.from({ length: 66 }, (_, cell) => {
      const poem = cells[cell];
      return poem === undefined ? null : idOf(poem);
    }),
  };
}

const BOARD = boardOf({ 0: 31, 65: 64, 64: 39, 63: 74 });

function inputOf(
  order: readonly number[],
  overrides: Partial<PlayInput> = {},
): PlayInput {
  return {
    board: BOARD,
    order: order.map(idOf),
    letterIntervalMs: 1000,
    autoNext: false,
    waitMs: 500,
    ...overrides,
  };
}

function sessionOf(
  order: readonly number[],
  overrides: Partial<PlayInput> = {},
) {
  const time = new FakeTime();
  const session = runSession(PLAY, inputOf(order, overrides), {
    clock: time,
    scheduler: time,
  });
  return { time, session };
}

test("仕様 08 §4.1 静的決まり字を、文字間隔ごとに1文字ずつ出す", () => {
  const { time, session } = sessionOf([31]);
  expect(session.view().letters).toBe("あ");
  expect(session.view().actions).toEqual({
    take: true,
    skip: true,
    next: false,
  });
  time.advance(1000);
  expect(session.view().letters).toBe("あさ");
  time.advance(4000);
  expect(session.view().letters).toBe("あさぼらけあ");
  expect(session.view().judgement).toBeNull();
  time.advance(999);
  expect(session.view().judgement).toBeNull();
  time.advance(1);
  expect(session.view().judgement).toEqual({ kind: "missed" });
});

test("仕様 08 §5 B-15 取れる間（決まる文字を出した時刻から文字間隔の間）に取ると正解。決まる文字は100首から読んだ歌を除いて決める", () => {
  // うか: うら is not read, so the deciding letter is か, at 1000.
  for (const at of [1000, 1500, 1999]) {
    const { time, session } = sessionOf([74]);
    time.advance(at);
    session.dispatch({ kind: "take", cell: 63 });
    time.advance(5000);
    expect(session.view().judgement, String(at)).toEqual({ kind: "correct" });
  }
});

test("仕様 08 §5 B-15 決まる文字の前に取ると早い。秒数は決まる文字を出すまで", () => {
  const { time, session } = sessionOf([74]);
  time.advance(250);
  session.dispatch({ kind: "take", cell: 63 });
  time.advance(5000);
  expect(session.view().judgement).toEqual({ kind: "early", seconds: 0.75 });
});

test("仕様 08 §5 取れる間より後に取ると遅い。秒数は取れる間の終わりから", () => {
  // うら is read first, so うか is decided by う, at the start.
  const { time, session } = sessionOf([65, 74], { board: BOARD });
  time.advance(5000);
  session.dispatch({ kind: "next" });
  time.advance(1250);
  session.dispatch({ kind: "take", cell: 63 });
  time.advance(5000);
  expect(session.view().judgement).toEqual({ kind: "late", seconds: 0.25 });
});

test("仕様 08 §4.2 §5 違う札を取ると違う札。最初の1回だけが有効", () => {
  const { time, session } = sessionOf([74]);
  time.advance(100);
  session.dispatch({ kind: "take", cell: 0 });
  time.advance(1000);
  session.dispatch({ kind: "take", cell: 63 });
  time.advance(5000);
  expect(session.view().judgement).toEqual({ kind: "wrong-card" });
});

test("仕様 08 §5 空札は、取らなければ正解（空札）、取れば違う札", () => {
  // むらさめ (87) is not on the board.
  const untouched = sessionOf([87]);
  untouched.time.advance(5000);
  expect(untouched.session.view().judgement).toEqual({ kind: "dead" });
  const touched = sessionOf([87]);
  touched.session.dispatch({ kind: "take", cell: 0 });
  touched.time.advance(5000);
  expect(touched.session.view().judgement).toEqual({ kind: "wrong-card" });
});

test("仕様 08 §4.4 読んだ札は判定のときに場から取り除き、取り除いたマスは取れない", () => {
  const { time, session } = sessionOf([31, 64]);
  time.advance(6000);
  const cell = session.view().cells[0];
  expect(cell?.poem).toBeNull();
  session.dispatch({ kind: "next" });
  session.dispatch({ kind: "take", cell: 0 });
  expect(session.view().actions.take).toBe(true);
});

test("仕様 08 §6 B-16 読んでいる途中のスキップは、その問を取り除き、前の問の予約を次の問に残さない", () => {
  const { time, session } = sessionOf([31, 64]);
  time.advance(1000);
  session.dispatch({ kind: "skip" });
  expect(session.view().cells[0]?.poem).toBeNull();
  expect(session.view().progress).toEqual({ finished: 1, total: 2 });
  expect(session.view().letters).toBe("あ");
  // 64 is read from now: its judgement comes 6000 later, and only then.
  time.advance(5999);
  expect(session.view().judgement).toBeNull();
  time.advance(1);
  expect(session.view().judgement).toEqual({ kind: "missed" });
  expect(session.view().progress).toEqual({ finished: 2, total: 2 });
  expect(session.view().cells[65]?.poem).toBeNull();
  time.advance(10000);
  expect(session.view().judgement).toEqual({ kind: "missed" });
});

test("仕様 08 §4.5 自動で次へ進む ON では、待機時間の後に次の問を読む。全部読んだら終わる", () => {
  const { time, session } = sessionOf([74, 31], {
    autoNext: true,
    waitMs: 500,
  });
  time.advance(2000);
  expect(session.view().judgement).toEqual({ kind: "missed" });
  time.advance(500);
  expect(session.view().letters).toBe("あ");
  expect(session.view().judgement).toBeNull();
  time.advance(6000);
  session.dispatch({ kind: "next" });
  expect(session.view().finished).toBe(true);
  expect(session.view().actions).toEqual({
    take: false,
    skip: false,
    next: false,
  });
  expect(time.pending).toBe(0);
});

test("ADR-0004 §2 読んでいる途中に意味のない操作と、今の問のものでない出来事は、何も変えない", () => {
  const reading = PLAY.start(inputOf([74]), 0).state;
  expect(
    PLAY.update(reading, { kind: "command", command: { kind: "next" }, at: 0 })
      .state,
  ).toBe(reading);
  expect(
    PLAY.update(reading, {
      kind: "command",
      command: { kind: "take", cell: 1 },
      at: 0,
    }).state,
  ).toBe(reading);
  for (const event of [
    { kind: "letter", question: 1, shown: 2 },
    { kind: "judge", question: 1 },
    { kind: "auto-next", question: 0 },
  ] as const) {
    expect(PLAY.update(reading, { kind: "timer", event, at: 0 }).state).toBe(
      reading,
    );
  }
});

test("ADR-0004 §2 判定の後と終わった後に意味のない操作と出来事は、何も変えない", () => {
  const reading = PLAY.start(inputOf([74]), 0).state;
  const judged = PLAY.update(reading, {
    kind: "timer",
    event: { kind: "judge", question: 0 },
    at: 2000,
  }).state;
  expect(PLAY.view(judged).judgement).toEqual({ kind: "missed" });
  for (const event of [
    { kind: "letter", question: 0, shown: 2 },
    { kind: "judge", question: 0 },
  ] as const) {
    expect(PLAY.update(judged, { kind: "timer", event, at: 0 }).state).toBe(
      judged,
    );
  }
  expect(
    PLAY.update(judged, { kind: "command", command: { kind: "skip" }, at: 0 })
      .state,
  ).toBe(judged);
  const finished = PLAY.start(inputOf([]), 0).state;
  expect(PLAY.view(finished).finished).toBe(true);
  for (const command of [
    { kind: "take", cell: 63 },
    { kind: "skip" },
    { kind: "next" },
  ] as const) {
    expect(
      PLAY.update(finished, { kind: "command", command, at: 0 }).state,
    ).toBe(finished);
  }
});

test("仕様 08 §3 仕様 03 §8 設定の出題の範囲と空札の除外で、読む札を作る", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    common: {
      ...DEFAULT_SETTINGS.common,
      selected: [idOf(31), idOf(87)],
    },
    play: { ...DEFAULT_SETTINGS.play, letterIntervalMs: 700 },
  };
  expect(playInput(settings, BOARD, () => 0)).toEqual({
    board: BOARD,
    order: [31],
    letterIntervalMs: 700,
    autoNext: false,
    waitMs: 500,
  });
  const withDead = {
    ...settings,
    play: { ...settings.play, excludeDead: false },
  };
  expect(playInput(withDead, BOARD, () => 0).order).toHaveLength(2);
});
