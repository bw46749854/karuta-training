import { multipleCardQuestions, questionTargets } from "@karuta/domain";
import type { Random } from "../ports";
import type { Settings } from "../settings/definition";
import type { MultipleCardFlowInput } from "./multiple-card-flow";

/** Spec 06 §2: the session's questions and settings, from the saved settings. */
export function multipleCardFlowInput(
  settings: Settings,
  random: Random,
): MultipleCardFlowInput {
  const { multiple } = settings;
  const targets = questionTargets(
    settings.common.limited,
    settings.common.selected,
  );
  return {
    questions: multipleCardQuestions(
      {
        targets,
        count: multiple.count,
        perQuestion: multiple.perQuestion,
        orientation: multiple.orientation,
      },
      random,
    ),
    targets,
    romajiAllowed: multiple.romajiAllowed,
    kimarijiChange: multiple.kimarijiChange,
    autoNext: multiple.autoNext,
    waitMs: multiple.waitMs,
    displayMs: multiple.displayMs,
  };
}
