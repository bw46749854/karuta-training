import {
  poemsOnBoard,
  questionTargets,
  readingOrder,
  type Board,
} from "@karuta/domain";
import type { Random } from "../ports";
import type { Settings } from "../settings/definition";
import type { PlayInput } from "./types";

/**
 * Spec 08 §3: the poems to read on the saved board, in a random order
 * (spec 03 §8), with the 実践練習 settings.
 */
export function playInput(
  settings: Settings,
  board: Board,
  random: Random,
): PlayInput {
  const { common, play } = settings;
  return {
    board,
    order: readingOrder(
      {
        targets: questionTargets(common.limited, common.selected),
        onBoard: poemsOnBoard(board),
        excludeDead: play.excludeDead,
      },
      random,
    ),
    letterIntervalMs: play.letterIntervalMs,
    autoNext: play.autoNext,
    waitMs: play.waitMs,
  };
}
