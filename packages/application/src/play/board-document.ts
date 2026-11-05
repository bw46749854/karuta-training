import { BOARD_SHAPES, POEMS, type Board, type PoemId } from "@karuta/domain";
import type { BoardRepository } from "../ports";
import { fieldOf } from "../settings/items";

// The saved board (spec 08 §2.2): its version, its shape, and the poem on
// each cell. A document that cannot be read is the same as no board.

const BOARD_VERSION = 1;

const POEM_IDS = new Map<number, PoemId>(
  POEMS.map((poem) => [poem.id, poem.id]),
);

export function boardDocument(board: Board): unknown {
  return {
    version: BOARD_VERSION,
    board: {
      rows: board.shape.rows,
      columns: board.shape.columns,
      cells: board.cells,
    },
  };
}

/** Each cell as a poem or empty; undefined if any is neither, or repeated. */
function cellsOf(saved: readonly unknown[]): (PoemId | null)[] | undefined {
  const cells: (PoemId | null)[] = [];
  const seen = new Set<PoemId>();
  for (const cell of saved) {
    const poem = typeof cell === "number" ? POEM_IDS.get(cell) : undefined;
    if (cell !== null && (poem === undefined || seen.has(poem))) {
      return undefined;
    }
    if (poem !== undefined) {
      seen.add(poem);
    }
    cells.push(poem ?? null);
  }
  return cells;
}

/** The board in a saved document, or undefined when it cannot be read. */
export function readBoardDocument(document: unknown): Board | undefined {
  if (fieldOf(document, "version") !== BOARD_VERSION) {
    return undefined;
  }
  const saved = fieldOf(document, "board");
  const shape = BOARD_SHAPES.find(
    (candidate) =>
      candidate.rows === fieldOf(saved, "rows") &&
      candidate.columns === fieldOf(saved, "columns"),
  );
  const savedCells = fieldOf(saved, "cells");
  if (
    shape === undefined ||
    !Array.isArray(savedCells) ||
    savedCells.length !== shape.rows * shape.columns
  ) {
    return undefined;
  }
  const cells = cellsOf(savedCells);
  return cells === undefined ? undefined : { shape, cells };
}

export async function loadBoard(
  repository: BoardRepository,
): Promise<Board | undefined> {
  return readBoardDocument(await repository.load());
}

export function saveBoard(
  repository: BoardRepository,
  board: Board,
): Promise<"saved" | "failed"> {
  return repository.save(boardDocument(board));
}
