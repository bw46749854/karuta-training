import { staticKimariji } from "../practice/kimariji-list";
import type { PlayState, PlayView } from "./types";

function cellsOf(state: PlayState): PlayView["cells"] {
  const { board } = state.input;
  const { columns, rows } = board.shape;
  const removed = new Set(state.removed);
  const { phase } = state;
  const taken =
    phase.kind === "reading"
      ? phase.taken?.cell
      : phase.kind === "judged"
        ? phase.taken
        : undefined;
  return board.cells.map((poem, index) => {
    const row = Math.floor(index / columns) + 1;
    return {
      index,
      row,
      column: (index % columns) + 1,
      side: row <= rows / 2 ? "opponent" : "own",
      poem: removed.has(index) ? null : poem,
      faceUp: true,
      selected: taken === index,
    };
  });
}

function lettersOf(state: PlayState): string {
  const { phase } = state;
  switch (phase.kind) {
    case "reading":
      return Array.from(staticKimariji(phase.poem))
        .slice(0, phase.shown)
        .join("");
    case "judged":
      return staticKimariji(phase.poem);
    case "finished":
      return "";
  }
}

/** Spec 08 §7: what the screen shows, made from the state. */
export function playView(state: PlayState): PlayView {
  const { phase } = state;
  const reading = phase.kind === "reading";
  return {
    shape: state.input.board.shape,
    cells: cellsOf(state),
    letters: lettersOf(state),
    judgement: phase.kind === "judged" ? phase.judgement : null,
    progress: {
      finished: state.results.length,
      total: state.input.order.length,
    },
    finished: phase.kind === "finished",
    actions: {
      take: reading && phase.taken === null,
      skip: reading,
      next: phase.kind === "judged",
    },
  };
}
