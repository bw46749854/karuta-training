import { romajiToKana } from "./romaji";

/** Why an answer cannot be made into hiragana (spec 02 §5). */
export type UnconvertibleReason =
  | "mixed"
  | "romaji-not-allowed"
  | "romaji-unconvertible"
  | "not-kana-or-romaji";

/** An answer made into hiragana, or why it cannot be (spec 02 §4). */
export type AnswerKana =
  | { readonly kind: "kana"; readonly kana: string }
  | { readonly kind: "unconvertible"; readonly reason: UnconvertibleReason };

const HIRAGANA = /[\u3041-\u3096]/;
const HALF_WIDTH_LETTER = /[A-Za-z]/;

function unconvertible(reason: UnconvertibleReason): AnswerKana {
  return { kind: "unconvertible", reason };
}

/** Whether the answer was made into exactly this kana. */
export function isKana(answer: AnswerKana, kana: string): boolean {
  // Stryker disable next-line ConditionalExpression: with the kind check made true, an unconvertible answer reads kana as undefined and still fails, so that mutant is equivalent. The other conditional mutants on this line were checked to be killed (2026-10-31).
  return answer.kind === "kana" && answer.kana === kana;
}

/** One answer made into hiragana, by the steps in spec 02 §4. */
export function answerKana(answer: string, romajiAllowed: boolean): AnswerKana {
  const hasHiragana = HIRAGANA.test(answer);
  const hasLetter = HALF_WIDTH_LETTER.test(answer);
  if (hasHiragana && hasLetter) {
    return unconvertible("mixed");
  }
  if (hasHiragana) {
    return { kind: "kana", kana: answer };
  }
  if (!hasLetter) {
    return unconvertible("not-kana-or-romaji");
  }
  if (!romajiAllowed) {
    return unconvertible("romaji-not-allowed");
  }
  const kana = romajiToKana(answer);
  return kana === undefined
    ? unconvertible("romaji-unconvertible")
    : { kind: "kana", kana };
}
