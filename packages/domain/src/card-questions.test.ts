import fc from "fast-check";
import { expect, test } from "vitest";
import {
  multipleCardQuestions,
  singleCardQuestions,
  type Orientation,
  type OrientationSetting,
} from "./card-questions";
import { POEMS } from "./poems";
import { allOutcomes, firstChoice, randomFrom } from "./test-support/random";
import vectors from "./vectors/card-questions.json" with { type: "json" };

const ALL = POEMS.map((poem) => poem.id);
const SETTINGS: OrientationSetting[] = ["upright", "upside-down", "random"];
const FIXED: Orientation[] = ["upright", "upside-down"];

const cases = fc.record({
  targets: fc.shuffledSubarray(ALL, { minLength: 1 }),
  count: fc.integer({ min: 1, max: 100 }),
  perQuestion: fc.integer({ min: 2, max: 6 }),
  orientation: fc.constantFrom(...SETTINGS),
  values: fc.array(fc.nat()),
});

function countsOf(outcomes: readonly string[]): Record<string, number> {
  return Object.fromEntries(
    [...Map.groupBy(outcomes, (outcome) => outcome)].map(([key, list]) => [
      key,
      list.length,
    ]),
  );
}

test.each(vectors.single)(
  "仕様 03 §4 $description",
  ({ targetCount, count, expectedCards }) => {
    const targets = ALL.slice(0, targetCount);
    const questions = singleCardQuestions(
      { targets, count, orientation: "upright" },
      firstChoice,
    );
    expect(questions).toHaveLength(expectedCards);
  },
);

test.each(vectors.multiple)(
  "仕様 03 §5 $description",
  ({ targetCount, count, perQuestion, expectedSizes }) => {
    const targets = ALL.slice(0, targetCount);
    const questions = multipleCardQuestions(
      { targets, count, perQuestion, orientation: "upright" },
      firstChoice,
    );
    expect(questions.map((question) => question.poems.length)).toEqual(
      expectedSizes,
    );
  },
);

test("仕様 03 §9.2 Q1 Q2 札流し：対象の中から、出題枚数と対象の数の少ない方の枚数を、重複なく出す", () => {
  fc.assert(
    fc.property(cases, ({ targets, count, orientation, values }) => {
      const poems = singleCardQuestions(
        { targets, count, orientation },
        randomFrom(values),
      ).map((question) => question.poem);
      expect(poems).toHaveLength(Math.min(count, targets.length));
      expect(new Set(poems).size).toBe(poems.length);
      expect(poems.every((poem) => targets.includes(poem))).toBe(true);
    }),
  );
});

test("仕様 03 §9.2 Q1〜Q3 複数枚：札流しと同じく札を選び、同時枚数ずつ区切る。最後の問は1枚以上、同時枚数以下", () => {
  fc.assert(
    fc.property(cases, (c) => {
      const questions = multipleCardQuestions(c, randomFrom(c.values));
      const poems = questions.flatMap((question) => question.poems);
      expect(poems).toHaveLength(Math.min(c.count, c.targets.length));
      expect(new Set(poems).size).toBe(poems.length);
      expect(poems.every((poem) => c.targets.includes(poem))).toBe(true);
      const sizes = questions.map((question) => question.poems.length);
      expect(sizes.slice(0, -1).every((size) => size === c.perQuestion)).toBe(
        true,
      );
      expect(sizes.at(-1)).toBeGreaterThanOrEqual(1);
      expect(sizes.at(-1)).toBeLessThanOrEqual(c.perQuestion);
    }),
  );
});

test("仕様 03 §9.2 Q4 向きが正方向・逆さまの設定なら、すべての札がその向き", () => {
  fc.assert(
    fc.property(cases, fc.constantFrom(...FIXED), (c, orientation) => {
      const random = randomFrom(c.values);
      const settings = { ...c, orientation };
      const all = [
        ...singleCardQuestions(settings, random),
        ...multipleCardQuestions(settings, random),
      ];
      expect(all.every((q) => q.orientation === orientation)).toBe(true);
    }),
  );
});

test("仕様 03 §4 札流し：向きがランダムなら、1枚ごとに、ほかの札と関係なく半々で決める", () => {
  const outcomes = allOutcomes((random) =>
    singleCardQuestions(
      { targets: ALL.slice(0, 2), count: 2, orientation: "random" },
      random,
    )
      .map((question) => question.orientation)
      .join(","),
  );
  expect(countsOf(outcomes)).toEqual({
    "upright,upright": 2,
    "upright,upside-down": 2,
    "upside-down,upright": 2,
    "upside-down,upside-down": 2,
  });
});

test("仕様 03 §5 複数枚：向きがランダムなら、問ごとに、ほかの問と関係なく半々で決める", () => {
  const outcomes = allOutcomes((random) =>
    multipleCardQuestions(
      {
        targets: ALL.slice(0, 4),
        count: 4,
        perQuestion: 2,
        orientation: "random",
      },
      random,
    )
      .map((question) => question.orientation)
      .join(","),
  );
  expect(countsOf(outcomes)).toEqual({
    "upright,upright": 24,
    "upright,upside-down": 24,
    "upside-down,upright": 24,
    "upside-down,upside-down": 24,
  });
});
