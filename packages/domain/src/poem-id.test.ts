import fc from "fast-check";
import { expect, test } from "vitest";
import { poemId } from "./poem-id";

test("仕様 01 §2 1〜100 の整数は、どれも歌番号になる", () => {
  for (let value = 1; value <= 100; value += 1) {
    expect(poemId(value)).toBe(value);
  }
});

test("仕様 01 §2 0 と 101 は歌番号にならない", () => {
  expect(() => poemId(0)).toThrow(
    new RangeError("Not a poem number (an integer from 1 to 100): 0"),
  );
  expect(() => poemId(101)).toThrow(
    new RangeError("Not a poem number (an integer from 1 to 100): 101"),
  );
});

test("仕様 01 §2 1〜100 の外の整数は、歌番号にならない", () => {
  const outside = fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 101 }));
  fc.assert(
    fc.property(outside, (value) => {
      expect(() => poemId(value)).toThrow(RangeError);
    }),
  );
});

test("仕様 01 §2 整数でない数は、歌番号にならない", () => {
  const notInteger = fc.double().filter((value) => !Number.isInteger(value));
  fc.assert(
    fc.property(notInteger, (value) => {
      expect(() => poemId(value)).toThrow(RangeError);
    }),
  );
});
