import { expect, test } from "vitest";
import { itemAt } from "./item-at";

test("ADR-0002 §1 範囲の中の番号なら、その位置のものを返す", () => {
  expect(itemAt(["a", "b"], 0)).toBe("a");
  expect(itemAt(["a", "b"], 1)).toBe("b");
});

test.each([
  ["範囲の上の端", 2],
  ["負の数", -1],
  ["整数でない数", 0.5],
])("ADR-0002 §1 範囲の外の番号は誤りなので、失敗する（%s）", (_, index) => {
  expect(() => itemAt(["a", "b"], index)).toThrow(
    new RangeError(`No item at ${String(index)} of 2`),
  );
});
