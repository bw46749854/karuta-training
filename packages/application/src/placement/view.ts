import { POEMS, PREFIX_GROUPS, type PlacementQuestion } from "@karuta/domain";
import { staticKimariji } from "../practice/kimariji-list";
import type { Phase, PlacementState, PlacementView } from "./types";

function questionText(question: PlacementQuestion): string {
  return question.kind === "group"
    ? question.group.name
    : staticKimariji(question.poem);
}

function actionsOf(phase: Phase): PlacementView["actions"] {
  const memorizing = phase.kind === "memorizing";
  const asking = phase.kind === "asking";
  const judged = phase.kind === "judged";
  return {
    flip: memorizing || (judged && phase.checking),
    select: asking,
    invert: memorizing,
    redeal: memorizing,
    start: memorizing,
    answer: asking,
    skip: asking,
    next: judged,
    end: !memorizing,
  };
}

function cellsOf(state: PlacementState): PlacementView["cells"] {
  const { board } = state.input;
  const { columns, rows } = board.shape;
  const selected = new Set(
    state.phase.kind === "memorizing" ? [] : state.phase.selected,
  );
  return board.cells.map((poem, index) => {
    const row = Math.floor(index / columns) + 1;
    return {
      index,
      row,
      column: (index % columns) + 1,
      side: row <= rows / 2 ? "opponent" : "own",
      poem,
      faceUp: poem !== null && state.faceDown[index] !== true,
      selected: selected.has(index),
    };
  });
}

function listsOf(
  state: PlacementState,
): Pick<PlacementView, "groups" | "poems"> {
  const { cells } = state.input.board;
  const down = new Set(
    cells.filter((_, index) => state.faceDown[index] === true),
  );
  const onBoard = new Set(cells);
  return {
    groups: PREFIX_GROUPS.filter((group) =>
      group.poems.some((poem) => onBoard.has(poem)),
    ).map((group) => ({
      name: group.name,
      selected: group.poems
        .filter((poem) => onBoard.has(poem))
        .every((poem) => down.has(poem)),
    })),
    poems: POEMS.filter((poem) => onBoard.has(poem.id)).map((poem) => ({
      id: poem.id,
      kimariji: poem.staticKimariji,
      selected: down.has(poem.id),
    })),
  };
}

/** Spec 07 §3: what the screen shows, made from the state. */
export function placementView(state: PlacementState): PlacementView {
  const { phase } = state;
  const asked = phase.kind === "memorizing" ? undefined : phase;
  return {
    shape: state.input.board.shape,
    cells: cellsOf(state),
    ...listsOf(state),
    question: asked === undefined ? null : questionText(asked.question),
    judgement: phase.kind === "judged" ? { correct: phase.correct } : null,
    progress:
      asked === undefined
        ? null
        : { finished: state.results.length, total: asked.questions.length },
    notice: phase.kind === "memorizing" ? phase.notice : null,
    actions: actionsOf(phase),
  };
}
