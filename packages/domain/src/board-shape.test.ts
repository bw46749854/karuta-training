import fc from "fast-check";
import { expect, test } from "vitest";
import { BOARD_SHAPES, boardShape } from "./board";

const keyOf = (rows: number, columns: number) =>
  `${String(rows)}x${String(columns)}`;

test("ADR-0007 §1 盤面の形は、6段か4段と、11列から8列の組み合わせの8つ", () => {
  const keys = BOARD_SHAPES.map((shape) => keyOf(shape.rows, shape.columns));
  expect(keys.toSorted()).toEqual(
    ["6x11", "6x10", "6x9", "6x8", "4x11", "4x10", "4x9", "4x8"].toSorted(),
  );
});

test("ADR-0007 §1 8つの形の段と列からは、その形ができる", () => {
  for (const shape of BOARD_SHAPES) {
    expect(boardShape(shape.rows, shape.columns)).toEqual(shape);
  }
});

test("ADR-0007 §1 8つの形にない段と列は、誤りとして失敗する", () => {
  expect(() => boardShape(5, 11)).toThrow(
    new RangeError("Not a board shape: 5 rows by 11 columns"),
  );
  fc.assert(
    fc.property(
      fc.integer({ min: -2, max: 14 }),
      fc.integer({ min: -2, max: 14 }),
      (rows, columns) => {
        fc.pre(
          !BOARD_SHAPES.some(
            (shape) => shape.rows === rows && shape.columns === columns,
          ),
        );
        expect(() => boardShape(rows, columns)).toThrow(RangeError);
      },
    ),
  );
});
