import fc from "fast-check";
import { expect, test } from "vitest";
import { deal, poemsOnBoard, type Board, type Layout } from "./board";
import { POEMS } from "./poems";
import { firstChoice, randomFrom } from "./test-support/random";
import vectors from "./vectors/dealing.json" with { type: "json" };

const ALL = POEMS.map((poem) => poem.id);
const COLUMNS = 11;

// Spec 03 §6.3: the order in which each side is filled.
const OPPONENT_ORDER = Array.from({ length: 33 }, (_, index) => index);
const OWN_ORDER = Array.from({ length: 33 }, (_, index) => 65 - index);

function layoutOf(rows: readonly string[]): boolean[] {
  return Array.from(rows.join(""), (cell) => cell !== "・");
}

function patternOf(board: Board, layout: Layout): string[] {
  const cells = board.map((poem, index) => {
    if (layout[index] !== true) {
      return "・";
    }
    return poem === null ? "○" : "■";
  });
  return Array.from({ length: 6 }, (_, row) =>
    cells.slice(row * COLUMNS, (row + 1) * COLUMNS).join(""),
  );
}

function usedIn(layout: Layout, order: readonly number[]): number[] {
  return order.filter((index) => layout[index] === true);
}

const dealing = fc.record({
  layout: fc.array(fc.boolean(), { minLength: 66, maxLength: 66 }),
  targets: fc.shuffledSubarray(ALL),
  values: fc.array(fc.nat()),
});

test.each(vectors)(
  "仕様 03 §6 $description",
  ({ layout, targetCount, expected }) => {
    const used = layoutOf(layout);
    for (const random of [firstChoice, randomFrom([5, 3, 8, 1])]) {
      const board = deal(ALL.slice(0, targetCount), used, random);
      expect(patternOf(board, used)).toEqual(expected);
    }
  },
);

test("仕様 03 §9.2 D1 配った札は対象の中にあり、重複しない。枚数は使うマスの数と対象の数の少ない方", () => {
  fc.assert(
    fc.property(dealing, ({ layout, targets, values }) => {
      const board = deal(targets, layout, randomFrom(values));
      const poems = poemsOnBoard(board);
      const used = layout.filter(Boolean).length;
      expect(board).toHaveLength(66);
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
      const misplaced = board.filter(
        (poem, index) => poem !== null && !layout[index],
      );
      expect(misplaced).toEqual([]);
      for (const order of [OPPONENT_ORDER, OWN_ORDER]) {
        const filled = usedIn(layout, order).map((i) => board[i] !== null);
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
      const t = usedIn(layout, OPPONENT_ORDER).length;
      const b = usedIn(layout, OWN_ORDER).length;
      const n = poemsOnBoard(board).length;
      const opponent = board.slice(0, 33).filter((poem) => poem !== null);
      expect(opponent).toHaveLength(
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
