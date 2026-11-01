import { expect, test } from "vitest";
import { BOARD_SHAPES, boardShape, type Layout } from "./board";
import { defaultLayout } from "./default-layouts";
import vectors from "./vectors/default-layouts.json" with { type: "json" };

// The figure of manual §6.3, the default decided for 6 rows by 11 columns.
const MANUAL_6X11 = [
  "○○○○○・・○○○○",
  "○○○○・・・○○○○",
  "○○○○・・・○○○○",
  "○○○○・・・○○○○",
  "○○○○・・・○○○○",
  "○○○○・・○○○○○",
];

function figureOf(layout: Layout): string[] {
  const { rows, columns } = layout.shape;
  const cells = layout.used.map((used) => (used ? "○" : "・"));
  return Array.from({ length: rows }, (_, row) =>
    cells.slice(row * columns, (row + 1) * columns).join(""),
  );
}

test.each(vectors)(
  "仕様 03 §6.1 $description の初期の配置は、仕様の図のとおり",
  ({ rows, columns, perSide, figure }) => {
    const layout = defaultLayout(boardShape(rows, columns));
    const half = layout.used.length / 2;
    expect(layout.shape).toEqual(boardShape(rows, columns));
    expect(figureOf(layout)).toEqual(figure);
    expect(layout.used.slice(0, half).filter(Boolean)).toHaveLength(perSide);
    expect(layout.used.slice(half).filter(Boolean)).toHaveLength(perSide);
  },
);

test("仕様 03 §9.2 B1 どの形の初期の配置も、相手陣は自陣を180度回したもの", () => {
  for (const shape of BOARD_SHAPES) {
    const { used } = defaultLayout(shape);
    const half = used.length / 2;
    expect(used.slice(0, half)).toEqual(used.slice(half).toReversed());
  }
});

test("仕様 03 §9.2 B1 6段×11列の初期の配置は、取扱説明書 §6.3 の図と一致する", () => {
  expect(figureOf(defaultLayout(boardShape(6, 11)))).toEqual(MANUAL_6X11);
});
