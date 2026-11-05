import {
  deal,
  placementQuestions,
  poemsOnBoard,
  questionTargets,
  type BoardShape,
  type PlacementQuestion,
} from "@karuta/domain";
import type { Random } from "../ports";
import type { Settings } from "../settings/definition";
import { layoutFor } from "../settings/items";
import type { PlacementInput } from "./types";

/**
 * Spec 07 §2: deals the targets onto the layout saved for the board shape
 * (spec 03 §6), with the 配置暗記 settings.
 */
export function placementInput(
  settings: Settings,
  shape: BoardShape,
  random: Random,
): PlacementInput {
  const { common, placement } = settings;
  const targets = questionTargets(common.limited, common.selected);
  return {
    board: deal(targets, layoutFor(common.layouts, shape), random),
    targets,
    mode: placement.mode,
    excludeDead: placement.excludeDead,
    showAnswer: placement.showAnswer,
    allowCheck: placement.allowCheck,
    autoNext: placement.autoNext,
    waitMs: placement.waitMs,
  };
}

/** Spec 07 §5.2: the questions in a new random order (spec 03 §7). */
export function placementQuestionsFor(
  input: PlacementInput,
  random: Random,
): PlacementQuestion[] {
  return placementQuestions(
    {
      targets: input.targets,
      onBoard: poemsOnBoard(input.board),
      mode: input.mode,
      excludeDead: input.excludeDead,
    },
    random,
  );
}
