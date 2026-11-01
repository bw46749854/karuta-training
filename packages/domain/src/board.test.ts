import fc from "fast-check";
import { expect, test } from "vitest";
import {
  BOARD_SHAPES,
  boardShape,
  deal,
  poemsOnBoard,
  type Board,
  type BoardShape,
  type Layout,
} from "./board";
import { POEMS } from "./poems";
import { firstChoice, randomFrom } from "./test-support/random";
import vectors from "./vectors/dealing.json" with { type: "json" };

const ALL = POEMS.map((poem) => poem.id);

function layoutOf(rows: readonly string[]): Layout {
  const columns = Array.from(rows[0] ?? "").length;
  return {
    shape: boardShape(rows.length, columns),
    used: Array.from(rows.join(""), (cell) => cell !== "・"),
  };
}

function patternOf(board: Board, layout: Layout): string[] {
  const { rows, columns } = board.shape;
  const cells = board.cells.map((poem, index) => {
    if (layout.used[index] !== true) {
      return "・";
    }
    return poem === null ? "○" : "■";
  });
  return Array.from({ length: rows }, (_, row) =>
    cells.slice(row * columns, (row + 1) * columns).join(""),
  );
}

// Spec 03 §6.3: the order in which each side is filled.
function fillOrders(shape: BoardShape): { opponent: number[]; own: number[] } {
  const half = (shape.rows / 2) * shape.columns;
  return {
    opponent: Array.from({ length: half }, (_, index) => index),
    own: Array.from({ length: half }, (_, index) => 2 * half - 1 - index),
  };
}

function usedIn(layout: Layout, order: readonly number[]): number[] {
  return order.filter((index) => layout.used[index] === true);
}

const dealing = fc
  .record({
    shape: fc.constantFrom(...BOARD_SHAPES),
    targets: fc.shuffledSubarray(ALL),
    values: fc.array(fc.nat()),
  })
  .chain(({ shape, targets, values }) =>
    fc.record({
      layout: fc
        .array(fc.boolean(), {
          minLength: shape.rows * shape.columns,
          maxLength: shape.rows * shape.columns,
        })
        .map((used): Layout => ({ shape, used })),
      targets: fc.constant(targets),
      values: fc.constant(values),
    }),
  );

test.each(vectors)(
  "仕様 03 §6 $description",
  ({ layout, targetCount, expected }) => {
    const used = layoutOf(layout);
    for (const random of [firstChoice, randomFrom([5, 3, 8, 1])]) {
      const board = deal(ALL.slice(0, targetCount), used, random);
      expect(board.shape).toEqual(used.shape);
      expect(patternOf(board, used)).toEqual(expected);
    }
  },
);

test("仕様 03 §9.2 D1 配った札は対象の中にあり、重複しない。枚数は使うマスの数と対象の数の少ない方", () => {
  fc.assert(
    fc.property(dealing, ({ layout, targets, values }) => {
      const board = deal(targets, layout, randomFrom(values));
      const poems = poemsOnBoard(board);
      const used = layout.used.filter(Boolean).length;
      expect(board.cells).toHaveLength(layout.used.length);
      expect(poems).toHaveLength(Math.min(used, targets.length));
      expect(new Set(poems).size).toBe(poems.length);
      expect(poems.every((poem) => targets.includes(poem))).toBe(true);
    }),
  );
});

test("仕様 03 §9.2 D2 札は使うマスにだけ置き、各陣で §6.3 の順の先頭に詰める", () => {
  fc.assert(
    fc.property(dealing, ({ layout, targets, values }) => {
      const board = deal(targets, layout, randomFrom(values));
      const misplaced = board.cells.filter(
        (poem, index) => poem !== null && layout.used[index] !== true,
      );
      expect(misplaced).toEqual([]);
      const { opponent, own } = fillOrders(layout.shape);
      for (const order of [opponent, own]) {
        const filled = usedIn(layout, order).map(
          (index) => board.cells[index] !== null,
        );
        expect(filled).toEqual(
          filled.toSorted((a, b) => Number(b) - Number(a)),
        );
      }
    }),
  );
});

test("仕様 03 §9.2 D3 相手陣の札は min(T, max(⌊n/2⌋, n − B)) 枚、自陣は残り", () => {
  fc.assert(
    fc.property(dealing, ({ layout, targets, values }) => {
      const board = deal(targets, layout, randomFrom(values));
      const { opponent, own } = fillOrders(layout.shape);
      const t = usedIn(layout, opponent).length;
      const b = usedIn(layout, own).length;
      const n = poemsOnBoard(board).length;
      const onOpponentSide = opponent.filter(
        (index) => board.cells[index] !== null,
      );
      expect(onOpponentSide).toHaveLength(
        Math.min(t, Math.max(Math.floor(n / 2), n - b)),
      );
    }),
  );
});

test("仕様 03 §9.2 R1 同じ乱数を与えれば、同じ配り方になる", () => {
  fc.assert(
    fc.property(dealing, ({ layout, targets, values }) => {
      expect(deal(targets, layout, randomFrom(values))).toEqual(
        deal(targets, layout, randomFrom(values)),
      );
    }),
  );
});
