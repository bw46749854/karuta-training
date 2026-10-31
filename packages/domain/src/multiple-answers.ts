import { answerKana, isKana } from "./answer-kana";

export type SplitAnswers =
  | { readonly kind: "empty" }
  | { readonly kind: "separators-only" }
  | { readonly kind: "answers"; readonly answers: readonly string[] };

export type MultipleAnswersResult =
  | {
      readonly kind: "not-accepted";
      readonly reason: "empty" | "separators-only" | "too-many";
    }
  | {
      readonly kind: "judged";
      readonly correct: boolean;
      readonly cards: readonly boolean[];
    };

// Spec 02 §3: half- and full-width comma, 読点, half- and full-width space.
const SEPARATOR = /[,\uFF0C\u3001 \u3000]/;

/** Splits a 複数枚 input into its answers (spec 02 §3). */
export function splitAnswers(input: string): SplitAnswers {
  if (input === "") {
    return { kind: "empty" };
  }
  const answers = input
    .split(SEPARATOR)
    .map((answer) => answer.trim())
    .filter((answer) => answer !== "");
  return answers.length === 0
    ? { kind: "separators-only" }
    : { kind: "answers", answers };
}

/**
 * Judges a 複数枚 question (spec 02 §6.2, §7). kimariji holds the kimariji
 * of each card in the question; cards in the result follow its order.
 */
export function judgeMultipleAnswers(
  input: string,
  kimariji: readonly string[],
  romajiAllowed: boolean,
): MultipleAnswersResult {
  const split = splitAnswers(input);
  if (split.kind !== "answers") {
    return { kind: "not-accepted", reason: split.kind };
  }
  if (split.answers.length > kimariji.length) {
    return { kind: "not-accepted", reason: "too-many" };
  }
  const answers = split.answers.map((answer) =>
    answerKana(answer, romajiAllowed),
  );
  const counts = kimariji.map(
    (k) => answers.filter((answer) => isKana(answer, k)).length,
  );
  // There are no more answers than cards (checked above). So when each
  // kimariji is answered exactly once, no answer is left over.
  return {
    kind: "judged",
    correct: counts.every((count) => count === 1),
    cards: counts.map((count) => count > 0),
  };
}
