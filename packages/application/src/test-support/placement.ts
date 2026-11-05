// Fixtures for the 配置暗記 tests. Test code only: it is left out of
// coverage and mutation testing.
import {
  boardShape,
  POEMS,
  PREFIX_GROUPS,
  type Board,
  type PlacementQuestion,
  type PoemId,
} from "@karuta/domain";
import {
  PLACEMENT,
  type PlacementCommand,
  type PlacementInput,
  type PlacementState,
} from "../placement/placement";

export const idOf = (number: number): PoemId => {
  const poem = POEMS.find((candidate) => candidate.id === number);
  if (poem === undefined) {
    throw new RangeError(String(number));
  }
  return poem.id;
};

const SHAPE = boardShape(6, 11);

// あさぼらけあ (31) top left, あさぼらけう (64) bottom right, あさじ (39)
// next to it, as the dealing puts three cards.
function boardOf(cells: Readonly<Record<number, number>>): Board {
  return {
    shape: SHAPE,
    cells: Array.from({ length: 66 }, (_, cell) => {
      const poem = cells[cell];
      return poem === undefined ? null : idOf(poem);
    }),
  };
}

const BOARD = boardOf({ 0: 31, 65: 64, 64: 39 });

export function inputOf(
  overrides: Partial<PlacementInput> = {},
): PlacementInput {
  return {
    board: BOARD,
    targets: [idOf(39), idOf(31), idOf(64)],
    mode: "individual",
    excludeDead: true,
    showAnswer: "when-correct",
    allowCheck: "when-correct",
    autoNext: false,
    waitMs: 500,
    ...overrides,
  };
}

export const individual = (number: number): PlacementQuestion => ({
  kind: "individual",
  poem: idOf(number),
});

export function group(name: string): PlacementQuestion {
  const found = PREFIX_GROUPS.find((candidate) => candidate.name === name);
  if (found === undefined) {
    throw new RangeError(name);
  }
  return { kind: "group", group: found };
}

export function play(
  input: PlacementInput,
  commands: readonly PlacementCommand[],
): PlacementState {
  return commands.reduce(
    (state, command) =>
      PLACEMENT.update(state, { kind: "command", command, at: 0 }).state,
    PLACEMENT.start(input, 0).state,
  );
}

/** The cards on the board, as [cell, face up]. */
export const faceUp = (state: PlacementState) =>
  PLACEMENT.view(state)
    .cells.filter((cell) => cell.poem !== null)
    .map((cell) => [cell.index, cell.faceUp]);

export const start = (...questions: PlacementQuestion[]): PlacementCommand => ({
  kind: "start",
  questions,
});
