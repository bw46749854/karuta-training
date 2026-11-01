import { itemAt } from "./item-at";
import type { PoemId } from "./poem-id";
import { shuffle, type RandomInt } from "./random";

/**
 * Which of the 66 cells may hold a card, row by row from the top left
 * (spec 03 §6.1). Rows 1 to 3 are the opponent's side, rows 4 to 6 one's own.
 */
export type Layout = readonly boolean[];

/** The poem on each of the 66 cells, row by row from the top left. */
export type Board = readonly (PoemId | null)[];

const CELL_COUNT = 66;
const SIDE_CELL_COUNT = 33;

// Spec 03 §6.3: each side is filled from the row nearest its player. The
// opponent's from row 1, left to right; one's own from row 6, right to left.
const OPPONENT_ORDER = Array.from(
  { length: SIDE_CELL_COUNT },
  (_, index) => index,
);
const OWN_ORDER = Array.from(
  { length: SIDE_CELL_COUNT },
  (_, index) => CELL_COUNT - 1 - index,
);

function usedCells(layout: Layout, order: readonly number[]): number[] {
  return order.filter((cell) => layout[cell] === true);
}

/** Deals the targets onto the used cells of the layout (spec 03 §6.2). */
export function deal(
  targets: readonly PoemId[],
  layout: Layout,
  random: RandomInt,
): Board {
  const opponentCells = usedCells(layout, OPPONENT_ORDER);
  const ownCells = usedCells(layout, OWN_ORDER);
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
  return Array.from(
    { length: CELL_COUNT },
    (_, cell) => poemByCell.get(cell) ?? null,
  );
}

/** The cards on the board, row by row from the top left. */
export function poemsOnBoard(board: Board): PoemId[] {
  return board.filter((poem) => poem !== null);
}
