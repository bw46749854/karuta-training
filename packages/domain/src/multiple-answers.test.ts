import fc from "fast-check";
import { expect, test } from "vitest";
import { judgeMultipleAnswers, splitAnswers } from "./multiple-answers";
import { POEMS } from "./poems";
import judgeVectors from "./vectors/multiple-answers-judge.json" with { type: "json" };
import splitVectors from "./vectors/multiple-answers-split.json" with { type: "json" };

// Spec 02 §3.
const SEPARATORS = [",", "，", "、", " ", "　"];

function staticKimarijiOf(id: number): string {
  return POEMS.find((poem) => poem.id === id)?.staticKimariji ?? "";
}

const hiragana = fc
  .integer({ min: 0x3041, max: 0x3096 })
  .map((codePoint) => String.fromCodePoint(codePoint));
const token = fc.string({ unit: hiragana, minLength: 1, maxLength: 4 });
const separatorRun = (minLength: number) =>
  fc.string({ unit: fc.constantFrom(...SEPARATORS), minLength, maxLength: 3 });

// A question of 1 to 6 cards, and the static kimariji of its cards.
const question = fc
  .shuffledSubarray([...POEMS], { minLength: 1, maxLength: 6 })
  .map((cards) => cards.map((card) => card.staticKimariji));

test.each(splitVectors)("仕様 02 §3 「$input」", ({ input, expected }) => {
  expect(splitAnswers(input)).toEqual(expected);
});

test.each(judgeVectors)(
  "仕様 02 §6.2 §7 $description",
  ({ cards, input, romajiAllowed, expected }) => {
    const result = judgeMultipleAnswers(
      input,
      cards.map(staticKimarijiOf),
      romajiAllowed,
    );
    expect(result).toEqual(expected);
  },
);

test("仕様 02 §8.2 M1 区切りをどれに替えても、重ねても、先頭や末尾に足しても、答えは変わらない", () => {
  const cases = fc
    .array(token, { minLength: 1, maxLength: 6 })
    .chain((answers) =>
      fc.record({
        answers: fc.constant(answers),
        between: fc.array(separatorRun(1), {
          minLength: answers.length - 1,
          maxLength: answers.length - 1,
        }),
        before: separatorRun(0),
        after: separatorRun(0),
      }),
    );
  fc.assert(
    fc.property(cases, ({ answers, between, before, after }) => {
      const joined = answers
        .map((answer, index) => answer + (between[index] ?? ""))
        .join("");
      expect(splitAnswers(before + joined + after)).toEqual({
        kind: "answers",
        answers,
      });
    }),
  );
});

test("仕様 02 §8.2 M2 答えの順番を入れ替えても、問の正誤も札ごとの正誤も変わらない", () => {
  const cases = question.chain((kimariji) =>
    fc
      .array(fc.constantFrom(...kimariji, "あ", "ム"), {
        minLength: 1,
        maxLength: kimariji.length,
      })
      .chain((answers) =>
        fc.record({
          kimariji: fc.constant(kimariji),
          answers: fc.constant(answers),
          shuffled: fc.shuffledSubarray(answers, {
            minLength: answers.length,
          }),
        }),
      ),
  );
  fc.assert(
    fc.property(cases, ({ kimariji, answers, shuffled }) => {
      expect(
        judgeMultipleAnswers(shuffled.join("、"), kimariji, false),
      ).toEqual(judgeMultipleAnswers(answers.join("、"), kimariji, false));
    }),
  );
});

test("仕様 02 §8.2 M3 問の札の決まり字をどの順で答えても、問も、問のどの札も正解", () => {
  const cases = question.chain((kimariji) =>
    fc.record({
      kimariji: fc.constant(kimariji),
      answers: fc.shuffledSubarray(kimariji, { minLength: kimariji.length }),
    }),
  );
  fc.assert(
    fc.property(cases, ({ kimariji, answers }) => {
      expect(judgeMultipleAnswers(answers.join(" "), kimariji, false)).toEqual({
        kind: "judged",
        correct: true,
        cards: kimariji.map(() => true),
      });
    }),
  );
});

test("仕様 02 §8.2 M3 問が正解なら、問のどの札も正解", () => {
  const cases = question.chain((kimariji) =>
    fc.record({
      kimariji: fc.constant(kimariji),
      answers: fc.array(fc.constantFrom(...kimariji, "あ"), {
        minLength: 1,
        maxLength: kimariji.length,
      }),
    }),
  );
  fc.assert(
    fc.property(cases, ({ kimariji, answers }) => {
      const result = judgeMultipleAnswers(answers.join("、"), kimariji, false);
      if (result.kind === "judged" && result.correct) {
        expect(result.cards.every(Boolean)).toBe(true);
      }
    }),
  );
});

test("仕様 02 §8.2 M4 答えが問の札の枚数より多ければ、判定しない", () => {
  const cases = question.chain((kimariji) =>
    fc.record({
      kimariji: fc.constant(kimariji),
      answers: fc.array(token, {
        minLength: kimariji.length + 1,
        maxLength: kimariji.length + 4,
      }),
    }),
  );
  fc.assert(
    fc.property(cases, ({ kimariji, answers }) => {
      expect(judgeMultipleAnswers(answers.join("、"), kimariji, false)).toEqual(
        {
          kind: "not-accepted",
          reason: "too-many",
        },
      );
    }),
  );
});
