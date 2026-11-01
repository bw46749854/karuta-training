import { itemAt } from "./item-at";
import type { PoemId } from "./poem-id";
import { shuffle, type RandomInt } from "./random";

/** The rows and columns of the board (ADR-0007 §1). */
export interface BoardShape {
  readonly rows: 4 | 6;
  readonly columns: 8 | 9 | 10 | 11;
}

const ROW_COUNTS = [6, 4] as const;
const COLUMN_COUNTS = [11, 10, 9, 8] as const;

export const BOARD_SHAPES: readonly BoardShape[] = ROW_COUNTS.flatMap((rows) =>
  COLUMN_COUNTS.map((columns): BoardShape => ({ rows, columns })),
);

/** The board shape with these rows and columns. Any other is a bug. */
export function boardShape(rows: number, columns: number): BoardShape {
  const shape = BOARD_SHAPES.find(
    (candidate) => candidate.rows === rows && candidate.columns === columns,
  );
  if (shape === undefined) {
    throw new RangeError(
      `Not a board shape: ${String(rows)} rows by ${String(columns)} columns`,
    );
  }
  return shape;
}

/**
 * Which cells of the board may hold a card, row by row from the top left
 * (spec 03 §6.1). The upper half of the rows is the opponent's side.
 */
export interface Layout {
  readonly shape: BoardShape;
  readonly used: readonly boolean[];
}

/** The poem on each cell of the board, row by row from the top left. */
export interface Board {
  readonly shape: BoardShape;
  readonly cells: readonly (PoemId | null)[];
}

// Spec 03 §6.3: each side is filled from the row nearest its player. The
// opponent's from the top row, left to right; one's own from the bottom row,
// right to left.
function fillOrders(shape: BoardShape): {
  readonly opponent: number[];
  readonly own: number[];
} {
  const half = (shape.rows / 2) * shape.columns;
  return {
    opponent: Array.from({ length: half }, (_, index) => index),
    own: Array.from({ length: half }, (_, index) => 2 * half - 1 - index),
  };
}

/** Deals the targets onto the used cells of the layout (spec 03 §6.2). */
export function deal(
  targets: readonly PoemId[],
  layout: Layout,
  random: RandomInt,
): Board {
  const { opponent, own } = fillOrders(layout.shape);
  const opponentCells = opponent.filter((cell) => layout.used[cell] === true);
  const ownCells = own.filter((cell) => layout.used[cell] === true);
  const shuffled = shuffle(targets, random);
  // As many cards as there are used cells, or all the targets if fewer.
  const count = Math.min(
    shuffled.length,
    opponentCells.length + ownCells.length,
  );
  // Half to the opponent, rounded down. What does not fit on one side goes
  // to the other.
  const opponentCount = Math.min(
    opponentCells.length,
    Math.max(Math.floor(count / 2), count - ownCells.length),
  );
  const cells = [
    ...opponentCells.slice(0, opponentCount),
    ...ownCells.slice(0, count - opponentCount),
  ];
  const poemByCell = new Map(
    cells.map((cell, index) => [cell, itemAt(shuffled, index)]),
  );
  return {
    shape: layout.shape,
    cells: Array.from(
      { length: layout.shape.rows * layout.shape.columns },
      (_, cell) => poemByCell.get(cell) ?? null,
    ),
  };
}

/** The cards on the board, row by row from the top left. */
export function poemsOnBoard(board: Board): PoemId[] {
  return board.cells.filter((poem) => poem !== null);
}
