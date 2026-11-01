import fc from "fast-check";
import { expect, test } from "vitest";
import { shuffle } from "./random";
import { allOutcomes, randomFrom } from "./test-support/random";

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

test.each([1, 2, 3, 4, 5])(
  "ADR-0002 §5 仕様 03 §9.2 R2 %i枚のシャッフルは、選び方をすべて試すと、どの並びもちょうど1回ずつ出る",
  (n) => {
    const items = Array.from({ length: n }, (_, index) => index);
    const outcomes = allOutcomes((random) => shuffle(items, random).join(","));
    expect(outcomes).toHaveLength(factorial(n));
    expect(new Set(outcomes).size).toBe(factorial(n));
  },
);

test("仕様 03 §3 シャッフルの結果は、元の札をちょうど1回ずつ並べ替えたもの。元の並びは変えない", () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), fc.array(fc.nat()), (items, values) => {
      const before = [...items];
      const shuffled = shuffle(items, randomFrom(values));
      expect(items).toEqual(before);
      expect(shuffled.toSorted((a, b) => a - b)).toEqual(
        before.toSorted((a, b) => a - b),
      );
    }),
  );
});

test("仕様 03 §9.2 R1 同じ乱数を与えれば、同じ並びになる", () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), fc.array(fc.nat()), (items, values) => {
      expect(shuffle(items, randomFrom(values))).toEqual(
        shuffle(items, randomFrom(values)),
      );
    }),
  );
});

test("ADR-0002 §1 乱数が 0 以上 n 未満の整数を返さないのは誤りなので、失敗する", () => {
  expect(() => shuffle([1, 2], () => 2)).toThrow(RangeError);
});
