import { answerKana, isKana, type AnswerKana } from "./answer-kana";

export type SingleAnswerResult =
  | { readonly kind: "not-accepted" }
  | {
      readonly kind: "judged";
      readonly correct: boolean;
      readonly answer: AnswerKana;
    };

/**
 * Judges 札流し (spec 02 §2, §6.1): the whole input is the answer, with
 * nothing trimmed, and it is right only when it is the kimariji.
 */
export function judgeSingleAnswer(
  input: string,
  kimariji: string,
  romajiAllowed: boolean,
): SingleAnswerResult {
  if (input === "") {
    return { kind: "not-accepted" };
  }
  const answer = answerKana(input, romajiAllowed);
  return { kind: "judged", correct: isKana(answer, kimariji), answer };
}
