import fc from "fast-check";
import { expect, test } from "vitest";
import { poemId } from "./poem-id";
import { POEMS } from "./poems";
import { readingOrder } from "./reading-order";
import { allOutcomes, firstChoice, randomFrom } from "./test-support/random";
import vectors from "./vectors/reading-order.json" with { type: "json" };

const ALL = POEMS.map((poem) => poem.id);

test.each(vectors)(
  "仕様 03 §8 $description",
  ({ targets, onBoard, excludeDead, expected }) => {
    const order = readingOrder(
      {
        targets: targets.map(poemId),
        onBoard: onBoard.map(poemId),
        excludeDead,
      },
      firstChoice,
    );
    expect(order.toSorted((a, b) => a - b)).toEqual(
      expected.toSorted((a, b) => a - b),
    );
  },
);

test("仕様 03 §9.2 P1 実践練習の読む札は、§8 の集まりをちょうど1回ずつ並べたもの", () => {
  const cases = fc.record({
    targets: fc.shuffledSubarray(ALL),
    onBoard: fc.subarray(ALL),
    excludeDead: fc.boolean(),
    values: fc.array(fc.nat()),
  });
  fc.assert(
    fc.property(cases, ({ targets, onBoard, excludeDead, values }) => {
      const order = readingOrder(
        { targets, onBoard, excludeDead },
        randomFrom(values),
      );
      const expected = targets.filter(
        (p) => !excludeDead || onBoard.includes(p),
      );
      expect(order.toSorted((a, b) => a - b)).toEqual(
        expected.toSorted((a, b) => a - b),
      );
    }),
  );
});

test("仕様 03 §8 読む順は、どの順も同じ確からしさで出る", () => {
  const targets = [poemId(87), poemId(18), poemId(57)];
  const outcomes = allOutcomes((random) =>
    readingOrder({ targets, onBoard: [], excludeDead: false }, random).join(
      ",",
    ),
  );
  expect(outcomes).toHaveLength(6);
  expect(new Set(outcomes).size).toBe(6);
});
