import { expect, test } from "vitest";
import { boardShapeFor, cardWidthFor } from "./board-shape";

test("ADR-0007 §2 段は領域の高さで決める：392 以上なら 6 段、263 以上なら 4 段", () => {
  const rowsAt = (height: number) =>
    boardShapeFor({ width: 1000, height })?.rows;
  expect(rowsAt(392)).toBe(6);
  expect(rowsAt(391)).toBe(4);
  expect(rowsAt(263)).toBe(4);
  expect(boardShapeFor({ width: 1000, height: 262 })).toBeNull();
});

test("ADR-0007 §2 列は領域の幅で決める：524・476・428・380 以上で 11・10・9・8 列", () => {
  const columnsAt = (width: number) =>
    boardShapeFor({ width, height: 500 })?.columns;
  expect(columnsAt(524)).toBe(11);
  expect(columnsAt(523)).toBe(10);
  expect(columnsAt(476)).toBe(10);
  expect(columnsAt(475)).toBe(9);
  expect(columnsAt(428)).toBe(9);
  expect(columnsAt(427)).toBe(8);
  expect(columnsAt(380)).toBe(8);
  expect(boardShapeFor({ width: 379, height: 500 })).toBeNull();
});

test("ADR-0007 §1 §2 札の幅は、幅と高さのきつい方で決まり、境ではちょうど下限の 44", () => {
  const shape = boardShapeFor({ width: 524, height: 392 });
  expect(shape).toEqual({ rows: 6, columns: 11 });
  if (shape === null) {
    return;
  }
  expect(cardWidthFor(shape, { width: 524, height: 392 })).toBeCloseTo(44, 0);
  // Wide but short: the height decides.
  expect(cardWidthFor(shape, { width: 2000, height: 392 })).toBeCloseTo(44, 0);
  // Tall but narrow: the width decides.
  expect(cardWidthFor(shape, { width: 524, height: 2000 })).toBeCloseTo(44, 5);
  expect(cardWidthFor(shape, { width: 1100, height: 2000 })).toBeCloseTo(
    (1100 - 40) / 11,
    5,
  );
});
