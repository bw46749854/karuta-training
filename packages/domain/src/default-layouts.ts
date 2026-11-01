import type { BoardShape, Layout } from "./board";

// Spec 03 §6.1: the default layout of each board shape, fixed data drawn as
// figures (○ used, ・ not used). Each opponent's side is one's own side
// turned 180 degrees; 6x11 is the figure of manual §6.3.
// One row of the board per line, so each figure reads like spec 03 §6.1.
// prettier-ignore
const FIGURES: Readonly<
  Record<
    BoardShape["rows"],
    Readonly<Record<BoardShape["columns"], readonly string[]>>
  >
> = {
  6: {
    11: [
      "○○○○○・・○○○○",
      "○○○○・・・○○○○",
      "○○○○・・・○○○○",
      "○○○○・・・○○○○",
      "○○○○・・・○○○○",
      "○○○○・・○○○○○",
    ],
    10: [
      "○○○○○・○○○○",
      "○○○○・・○○○○",
      "○○○○・・○○○○",
      "○○○○・・○○○○",
      "○○○○・・○○○○",
      "○○○○・○○○○○",
    ],
    9: [
      "○○○○○○○○○",
      "○○○○・○○○○",
      "○○○○・○○○○",
      "○○○○・○○○○",
      "○○○○・○○○○",
      "○○○○○○○○○",
    ],
    8: [
      "○○○○○○○○",
      "○○○○○○○○",
      "○○○○○○○○",
      "○○○○○○○○",
      "○○○○○○○○",
      "○○○○○○○○",
    ],
  },
  4: {
    11: [
      "○○○○○・・○○○○",
      "○○○○・・・○○○○",
      "○○○○・・・○○○○",
      "○○○○・・○○○○○",
    ],
    10: [
      "○○○○○・○○○○",
      "○○○○・・○○○○",
      "○○○○・・○○○○",
      "○○○○・○○○○○",
    ],
    9: [
      "○○○○○○○○○",
      "○○○○・○○○○",
      "○○○○・○○○○",
      "○○○○○○○○○",
    ],
    8: [
      "○○○○○○○○",
      "○○○○○○○○",
      "○○○○○○○○",
      "○○○○○○○○",
    ],
  },
};

/** The default layout of the board shape (spec 03 §6.1). */
export function defaultLayout(shape: BoardShape): Layout {
  const figure = FIGURES[shape.rows][shape.columns];
  return {
    shape,
    used: Array.from(figure.join(""), (cell) => cell === "○"),
  };
}
