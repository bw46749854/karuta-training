import { POEMS, type PoemId, type SingleCardQuestion } from "@karuta/domain";
import { expect, test } from "vitest";
import { FakeTime } from "../test-support/fake-time";
import { runSession } from "../practice/runner";
import { DEFAULT_SETTINGS } from "../settings/definition";
import {
  CARD_FLOW,
  cardFlowInput,
  kimarijiList,
  type CardFlowCommand,
  type CardFlowInput,
  type CardFlowState,
} from "./card-flow";

const idOf = (number: number): PoemId => {
  const poem = POEMS.find((candidate) => candidate.id === number);
  if (poem === undefined) {
    throw new RangeError(String(number));
  }
  return poem.id;
};

const upright = (...numbers: number[]): SingleCardQuestion[] =>
  numbers.map((number) => ({ poem: idOf(number), orientation: "upright" }));

function inputOf(
  questions: SingleCardQuestion[],
  overrides: Partial<CardFlowInput> = {},
): CardFlowInput {
  return {
    questions,
    targets: questions.map((question) => question.poem),
    romajiAllowed: true,
    kimarijiChange: true,
    autoNext: false,
    waitMs: 500,
    ...overrides,
  };
}

function play(
  input: CardFlowInput,
  commands: readonly CardFlowCommand[],
): CardFlowState {
  return commands.reduce(
    (state, command) =>
      CARD_FLOW.update(state, { kind: "command", command, at: 0 }).state,
    CARD_FLOW.start(input, 0).state,
  );
}

const answer = (text: string): CardFlowCommand[] => [
  { kind: "input", text },
  { kind: "answer" },
];
const skip: CardFlowCommand = { kind: "skip" };
const next: CardFlowCommand = { kind: "next" };

test("仕様 05 §2.1 §3 開くと1問目の札を出し、進捗は 0 / N。空欄では答えられず、スキップはできる", () => {
  const view = CARD_FLOW.view(play(inputOf(upright(87, 18, 57)), []));
  expect(view.card).toEqual({ poem: 87, orientation: "upright" });
  expect(view.progress).toEqual({ finished: 0, total: 3 });
  expect(view.actions).toEqual({ answer: false, skip: true, next: false });
  expect(view.judgement).toBeNull();
  expect(view.finished).toBe(false);
});

test("仕様 05 §4.3 §4.5 正解すると「正解」を出し、入力を変えられなくなり、次へ進める", () => {
  const state = play(inputOf(upright(87, 18)), answer("む"));
  const view = CARD_FLOW.view(state);
  expect(view.judgement).toEqual({ kind: "correct" });
  expect(view.progress).toEqual({ finished: 1, total: 2 });
  expect(view.actions).toEqual({ answer: false, skip: false, next: true });
  expect(view.input).toBe("む");
  expect(view.inputLocked).toBe(true);
  const typed = CARD_FLOW.update(state, {
    kind: "command",
    command: { kind: "input", text: "す" },
    at: 0,
  });
  expect(typed.state).toBe(state);
});

test("仕様 05 §4.3 B-22 不正解では正解の決まり字と、かなに直せない理由を出す", () => {
  expect(
    CARD_FLOW.view(play(inputOf(upright(87)), answer("ム"))).judgement,
  ).toEqual({ kind: "wrong", kimariji: "む", reason: "not-kana-or-romaji" });
  expect(
    CARD_FLOW.view(play(inputOf(upright(87)), answer("す"))).judgement,
  ).toEqual({ kind: "wrong", kimariji: "む", reason: null });
  expect(
    CARD_FLOW.view(
      play(inputOf(upright(87), { romajiAllowed: false }), answer("mu")),
    ).judgement,
  ).toEqual({ kind: "wrong", kimariji: "む", reason: "romaji-not-allowed" });
});

test("仕様 05 §4.2 B-25 空欄で答えても、何も起きない", () => {
  const state = play(inputOf(upright(87)), []);
  expect(play(inputOf(upright(87)), [{ kind: "answer" }])).toEqual(state);
  expect(
    CARD_FLOW.update(state, {
      kind: "command",
      command: { kind: "answer" },
      at: 0,
    }).state,
  ).toBe(state);
});

test("仕様 05 §5 §6 B-21 B-24 スキップを続けると進捗が進んで終わり、終わった後は何も効かない", () => {
  const input = inputOf(upright(87, 18, 57), { autoNext: true });
  const progress = [0, 1, 2, 3].map(
    (count) =>
      CARD_FLOW.view(play(input, Array<CardFlowCommand>(count).fill(skip)))
        .progress.finished,
  );
  expect(progress).toEqual([0, 1, 2, 3]);
  const finished = play(input, [skip, skip, skip]);
  const view = CARD_FLOW.view(finished);
  expect(view.finished).toBe(true);
  expect(view.card).toBeNull();
  expect(view.actions).toEqual({ answer: false, skip: false, next: false });
  for (const command of [skip, next, ...answer("む")]) {
    expect(
      CARD_FLOW.update(finished, { kind: "command", command, at: 0 }).state,
    ).toBe(finished);
  }
  expect(
    CARD_FLOW.update(finished, {
      kind: "timer",
      event: { kind: "auto-next", question: 2 },
      at: 0,
    }).state,
  ).toBe(finished);
});

test("仕様 05 §5 判定前に「次へ」、判定後に「スキップ」は効かない", () => {
  const asking = play(inputOf(upright(87, 18)), []);
  expect(
    CARD_FLOW.update(asking, { kind: "command", command: next, at: 0 }).state,
  ).toBe(asking);
  const judged = play(inputOf(upright(87, 18)), answer("む"));
  expect(
    CARD_FLOW.update(judged, { kind: "command", command: skip, at: 0 }).state,
  ).toBe(judged);
});

test("仕様 05 §4.4 B-01 決まり字変化を考慮する OFF では、静的決まり字が正解", () => {
  const off = inputOf(upright(65, 74), { kimarijiChange: false });
  expect(
    CARD_FLOW.view(play(off, [...answer("うら"), next, ...answer("うか")]))
      .judgement,
  ).toEqual({ kind: "correct" });
  const on = inputOf(upright(65, 74));
  expect(
    CARD_FLOW.view(play(on, [...answer("うら"), next, ...answer("うか")]))
      .judgement,
  ).toEqual({ kind: "wrong", kimariji: "う", reason: null });
  expect(CARD_FLOW.view(play(on, [skip, ...answer("う")])).judgement).toEqual({
    kind: "correct",
  });
});

test("仕様 05 §4.4 B-02 限定しても、決まり字は100首から出た札を除いて計算する", () => {
  expect(
    CARD_FLOW.view(play(inputOf(upright(74)), answer("うか"))).judgement,
  ).toEqual({ kind: "correct" });
});

test("仕様 05 §5 自動で次へ進む ON では、待機時間の後に次の問になり、待つ間に「次へ」を押すとすぐ進む", () => {
  const time = new FakeTime();
  const session = runSession(
    CARD_FLOW,
    inputOf(upright(87, 18, 57), { autoNext: true, waitMs: 800 }),
    { clock: time, scheduler: time },
  );
  session.dispatch({ kind: "input", text: "む" });
  session.dispatch({ kind: "answer" });
  time.advance(799);
  expect(session.view().card?.poem).toBe(87);
  time.advance(1);
  expect(session.view().card?.poem).toBe(18);
  expect(session.view().judgement).toBeNull();
  session.dispatch({ kind: "input", text: "す" });
  session.dispatch({ kind: "answer" });
  session.dispatch(next);
  expect(session.view().card?.poem).toBe(57);
  expect(time.pending).toBe(0);
  time.advance(10000);
  expect(session.view().card?.poem).toBe(57);
});

test("仕様 05 §5 自動で次へ進む OFF では、予約をしない", () => {
  const step = CARD_FLOW.update(play(inputOf(upright(87, 18)), []), {
    kind: "command",
    command: { kind: "answer" },
    at: 0,
  });
  expect(step.effects).toEqual([]);
  const answered = CARD_FLOW.update(
    play(inputOf(upright(87, 18)), [{ kind: "input", text: "む" }]),
    { kind: "command", command: { kind: "answer" }, at: 0 },
  );
  expect(answered.effects).toEqual([]);
});

test("ADR-0004 §3 今の問のものでない予約の出来事は、状態を変えない", () => {
  const judged = play(inputOf(upright(87, 18, 57), { autoNext: true }), [
    skip,
    ...answer("す"),
  ]);
  for (const question of [0, 2]) {
    expect(
      CARD_FLOW.update(judged, {
        kind: "timer",
        event: { kind: "auto-next", question },
        at: 0,
      }).state,
    ).toBe(judged);
  }
  const asking = play(inputOf(upright(87, 18), { autoNext: true }), []);
  expect(
    CARD_FLOW.update(asking, {
      kind: "timer",
      event: { kind: "auto-next", question: 0 },
      at: 0,
    }).state,
  ).toBe(asking);
});

test("仕様 05 §8.3 一覧の状態：未読・変化中、正解・誤答・スキップと、出た時点の変化", () => {
  // うら, うか, then む: うか is asked after うら, so it has changed.
  const input = inputOf(upright(65, 74, 87));
  const state = play(input, [...answer("うら"), next, skip]);
  expect(kimarijiList(state, "kimariji")).toEqual([
    { poem: 87, kimariji: "む", status: "unread", changed: false },
    { poem: 74, kimariji: "うか", status: "skipped", changed: true },
    { poem: 65, kimariji: "うら", status: "correct", changed: false },
  ]);
  expect(CARD_FLOW.view(state).list).toEqual({
    kimariji: kimarijiList(state, "kimariji"),
    asked: kimarijiList(state, "asked"),
  });
  const before = play(input, answer("うか"));
  expect(kimarijiList(before, "kimariji")).toEqual([
    { poem: 87, kimariji: "む", status: "unread", changed: false },
    { poem: 74, kimariji: "うか", status: "unread", changed: true },
    { poem: 65, kimariji: "うら", status: "wrong", changed: false },
  ]);
});

test("仕様 05 §8.3 決まり字変化を考慮する OFF では、どの行も初期", () => {
  const state = play(inputOf(upright(65, 74), { kimarijiChange: false }), [
    skip,
  ]);
  expect(kimarijiList(state, "kimariji").map((row) => row.changed)).toEqual([
    false,
    false,
  ]);
});

test("仕様 05 §8.5 出題順は、終わった問の札だけを出題した順に並べる", () => {
  const state = play(inputOf(upright(57, 87, 18)), [skip, ...answer("む")]);
  expect(kimarijiList(state, "asked").map((row) => row.poem)).toEqual([57, 87]);
});

test("仕様 05 §2 仕様 03 §4 設定から、出題の対象・出題枚数・向きと、札流しの項目を渡す", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    common: { ...DEFAULT_SETTINGS.common, selected: [idOf(87), idOf(18)] },
    cardFlow: {
      ...DEFAULT_SETTINGS.cardFlow,
      count: 1,
      orientation: "upside-down" as const,
      autoNext: true,
      waitMs: 1200,
    },
  };
  // With 0 every time, the shuffle swaps the two poems (ADR-0002 §4).
  const input = cardFlowInput(settings, () => 0);
  expect(input).toEqual({
    questions: [{ poem: 18, orientation: "upside-down" }],
    targets: [87, 18],
    romajiAllowed: true,
    kimarijiChange: true,
    autoNext: true,
    waitMs: 1200,
  });
});

test("仕様 05 §6 出題する札がなければ、初めから終わり", () => {
  const view = CARD_FLOW.view(CARD_FLOW.start(inputOf([]), 0).state);
  expect(view.finished).toBe(true);
  expect(view.card).toBeNull();
  expect(view.progress).toEqual({ finished: 0, total: 0 });
});
