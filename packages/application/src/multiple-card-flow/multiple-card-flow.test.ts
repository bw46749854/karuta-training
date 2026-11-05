import { POEMS, type MultipleCardQuestion, type PoemId } from "@karuta/domain";
import { expect, test } from "vitest";
import { runSession } from "../practice/runner";
import { DEFAULT_SETTINGS } from "../settings/definition";
import { FakeTime } from "../test-support/fake-time";
import { multipleCardFlowInput } from "./input";
import {
  MULTIPLE_CARD_FLOW,
  type MultipleCardFlowCommand,
  type MultipleCardFlowInput,
  type MultipleCardFlowState,
} from "./multiple-card-flow";

const idOf = (number: number): PoemId => {
  const poem = POEMS.find((candidate) => candidate.id === number);
  if (poem === undefined) {
    throw new RangeError(String(number));
  }
  return poem.id;
};

const questionsOf = (...groups: number[][]): MultipleCardQuestion[] =>
  groups.map((group) => ({
    poems: group.map(idOf),
    orientation: "upright",
  }));

function inputOf(
  questions: MultipleCardQuestion[],
  overrides: Partial<MultipleCardFlowInput> = {},
): MultipleCardFlowInput {
  return {
    questions,
    targets: questions.flatMap((question) => question.poems),
    romajiAllowed: true,
    kimarijiChange: false,
    autoNext: false,
    waitMs: 500,
    displayMs: 1000,
    ...overrides,
  };
}

const M = MULTIPLE_CARD_FLOW;

function play(
  input: MultipleCardFlowInput,
  commands: readonly MultipleCardFlowCommand[],
): MultipleCardFlowState {
  return commands.reduce(
    (state, command) =>
      M.update(state, { kind: "command", command, at: 0 }).state,
    M.start(input, 0).state,
  );
}

const answer = (text: string): MultipleCardFlowCommand[] => [
  { kind: "input", text },
  { kind: "answer" },
];
const skip: MultipleCardFlowCommand = { kind: "skip" };
const next: MultipleCardFlowCommand = { kind: "next" };

test("仕様 06 §3 §4 始めると1問目の札を位置の順に表で出し、伏せる予約をする。進捗は札の枚数", () => {
  const step = M.start(inputOf(questionsOf([87, 18], [57])), 0);
  const view = M.view(step.state);
  expect(view.cards).toEqual([
    { position: 1, poem: 87, hidden: false },
    { position: 2, poem: 18, hidden: false },
  ]);
  expect(view.orientation).toBe("upright");
  expect(view.progress).toEqual({ finished: 0, total: 3 });
  expect(view.actions).toEqual({ answer: false, skip: true, next: false });
  expect(step.effects).toEqual([
    {
      kind: "schedule",
      key: "hide",
      afterMs: 1000,
      event: { kind: "hide", question: 0 },
    },
  ]);
});

test("仕様 06 §4.1 §4.3 出現時間が経つと伏せ、判定すると表に戻す", () => {
  const state = play(inputOf(questionsOf([87, 18], [57])), []);
  const hidden = M.update(state, {
    kind: "timer",
    event: { kind: "hide", question: 0 },
    at: 1000,
  }).state;
  expect(M.view(hidden).cards.map((card) => card.hidden)).toEqual([true, true]);
  const judged = M.update(
    M.update(hidden, {
      kind: "command",
      command: { kind: "input", text: "む す" },
      at: 0,
    }).state,
    { kind: "command", command: { kind: "answer" }, at: 0 },
  );
  expect(M.view(judged.state).cards.map((card) => card.hidden)).toEqual([
    false,
    false,
  ]);
  expect(M.view(judged.state).judgement).toEqual({ correct: true });
  expect(judged.effects).toEqual([{ kind: "cancel", key: "hide" }]);
});

test("仕様 06 §5.3 札ごとに判定し、問の正誤を出す。進捗は判定した札の枚数", () => {
  const state = play(inputOf(questionsOf([87, 18], [57])), answer("す、む"));
  const view = M.view(state);
  expect(view.judgement).toEqual({ correct: true });
  expect(view.progress).toEqual({ finished: 2, total: 3 });
  expect(view.actions).toEqual({ answer: false, skip: false, next: true });
  expect(view.inputLocked).toBe(true);
  const wrong = M.view(play(inputOf(questionsOf([87, 18])), answer("す")));
  expect(wrong.judgement).toEqual({ correct: false });
});

test("仕様 06 §5.2 B-25 空欄は何もしない。区切りだけ・多すぎる答えは、知らせて入力欄を空にする", () => {
  const input = inputOf(questionsOf([87, 18]));
  const asking = play(input, []);
  expect(
    M.update(asking, { kind: "command", command: { kind: "answer" }, at: 0 })
      .state,
  ).toBe(asking);
  for (const [text, notice] of [
    ["、、", "separators-only"],
    ["む す め", "too-many"],
  ] as const) {
    const view = M.view(play(input, answer(text)));
    expect(view.notice).toBe(notice);
    expect(view.input).toBe("");
    expect(view.judgement).toBeNull();
    expect(view.progress.finished).toBe(0);
    expect(
      M.view(play(input, [...answer(text), { kind: "input", text: "む" }]))
        .notice,
    ).toBeNull();
  }
});

test("仕様 06 §2.3 B-03 ローマ字入力を許可していれば、ローマ字で答えられる", () => {
  expect(
    M.view(play(inputOf(questionsOf([87, 18])), answer("mu,su"))).judgement,
  ).toEqual({ correct: true });
  expect(
    M.view(
      play(
        inputOf(questionsOf([87, 18]), { romajiAllowed: false }),
        answer("mu,su"),
      ),
    ).judgement,
  ).toEqual({ correct: false });
});

test("仕様 06 §5.4 B-05 B-06 決まり字変化は前の問の札で決まり、最後の1枚の問も100首から計算する", () => {
  const on = inputOf(questionsOf([65, 23], [74]), { kimarijiChange: true });
  expect(
    M.view(play(on, [...answer("うら つき"), next, ...answer("う")])).judgement,
  ).toEqual({ correct: true });
  const off = inputOf(questionsOf([65, 23], [74]));
  expect(
    M.view(play(off, [...answer("うら つき"), next, ...answer("うか")]))
      .judgement,
  ).toEqual({ correct: true });
  const last = inputOf(questionsOf([40, 37], [23]), { kimarijiChange: true });
  expect(
    M.view(play(last, [...answer("しの しら"), next, ...answer("つき")]))
      .judgement,
  ).toEqual({ correct: true });
  // 同じ問の中では変えない（仕様 02 §6.3）。
  const same = inputOf(questionsOf([65, 74]), { kimarijiChange: true });
  expect(M.view(play(same, answer("うか うら"))).judgement).toEqual({
    correct: true,
  });
});

test("仕様 06 §6 §7 B-07 B-08 B-19 スキップは問の札すべてを記録して進み、最後の後は終わる", () => {
  const input = inputOf(questionsOf([87, 18], [57]));
  const second = play(input, [skip]);
  expect(M.view(second).cards).toEqual([
    { position: 1, poem: 57, hidden: false },
  ]);
  expect(M.view(second).progress.finished).toBe(2);
  const finished = play(input, [skip, skip]);
  const view = M.view(finished);
  expect(view.finished).toBe(true);
  expect(view.cards).toEqual([]);
  expect(view.orientation).toBeNull();
  expect(view.progress).toEqual({ finished: 3, total: 3 });
  expect(view.actions).toEqual({ answer: false, skip: false, next: false });
  for (const command of [skip, next, ...answer("め")]) {
    expect(M.update(finished, { kind: "command", command, at: 0 }).state).toBe(
      finished,
    );
  }
});

test("仕様 06 §6 自動で次へ進む ON では待機時間の後に次の問になり、次の問の札も出現時間の後に伏せる", () => {
  const time = new FakeTime();
  const session = runSession(
    M,
    inputOf(questionsOf([87, 18], [57]), { autoNext: true, waitMs: 300 }),
    { clock: time, scheduler: time },
  );
  session.dispatch({ kind: "input", text: "む す" });
  session.dispatch({ kind: "answer" });
  time.advance(300);
  expect(session.view().cards).toEqual([
    { position: 1, poem: 57, hidden: false },
  ]);
  time.advance(1000);
  expect(session.view().cards).toEqual([
    { position: 1, poem: 57, hidden: true },
  ]);
  session.dispatch(next);
  expect(session.view().cards).toEqual([
    { position: 1, poem: 57, hidden: true },
  ]);
});

test("ADR-0004 §3 今の問のものでない予約の出来事は、状態を変えない", () => {
  const input = inputOf(questionsOf([87, 18], [57]), { autoNext: true });
  const second = play(input, [skip]);
  for (const event of [
    { kind: "hide", question: 0 },
    { kind: "auto-next", question: 0 },
    { kind: "auto-next", question: 1 },
  ] as const) {
    expect(M.update(second, { kind: "timer", event, at: 0 }).state).toBe(
      second,
    );
  }
  const judged = play(input, answer("む す"));
  expect(
    M.update(judged, {
      kind: "timer",
      event: { kind: "hide", question: 0 },
      at: 0,
    }).state,
  ).toBe(judged);
});

test("仕様 06 §8 一覧は札ごとの正誤とスキップ、問ごとの変化を出し、出題順は問の中の位置の順", () => {
  const input = inputOf(questionsOf([65, 87], [74]), { kimarijiChange: true });
  const state = play(input, [...answer("うら す"), next, skip]);
  expect(M.view(state).list.kimariji).toEqual([
    { poem: 87, kimariji: "む", status: "wrong", changed: false },
    { poem: 74, kimariji: "うか", status: "skipped", changed: true },
    { poem: 65, kimariji: "うら", status: "correct", changed: false },
  ]);
  expect(M.view(state).list.asked.map((row) => row.poem)).toEqual([65, 87, 74]);
});

test("仕様 06 §2 仕様 03 §5 設定から、問への分け方と複数枚の項目を渡す", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    common: {
      ...DEFAULT_SETTINGS.common,
      selected: [idOf(87), idOf(18), idOf(57)],
    },
    multiple: {
      ...DEFAULT_SETTINGS.multiple,
      count: 3,
      perQuestion: 2,
      displayMs: 700,
    },
  };
  const input = multipleCardFlowInput(settings, () => 0);
  expect(input.questions.map((question) => question.poems)).toEqual([
    [18, 57],
    [87],
  ]);
  expect(input).toMatchObject({
    targets: [87, 18, 57],
    romajiAllowed: true,
    kimarijiChange: false,
    autoNext: false,
    waitMs: 500,
    displayMs: 700,
  });
});
