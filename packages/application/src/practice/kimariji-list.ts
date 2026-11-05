import { CandidateSet, kimariji, POEMS, type PoemId } from "@karuta/domain";
import type { Outcome } from "./contract";

// Parts the card flows share (ADR-0004 §4): the kimariji of a card, and the
// kimariji list (spec 05 §8, spec 06 §8).

/** One finished card: its result, and whether its kimariji had changed. */
export interface CardResult {
  readonly poem: PoemId;
  readonly outcome: Outcome;
  readonly changed: boolean;
}

/** Spec 05 §8.3. */
export interface KimarijiRow {
  readonly poem: PoemId;
  readonly kimariji: string;
  readonly status: "unread" | Outcome;
  readonly changed: boolean;
}

export type ListOrder = "kimariji" | "asked";

const ALL_CANDIDATES = CandidateSet.afterReading([]);

/** With all 100 poems as candidates, this is the static kimariji. */
export function staticKimariji(poem: PoemId): string {
  return kimariji(poem, ALL_CANDIDATES);
}

/** The candidates after these poems were read, or all 100 when off. */
export function candidatesAfter(
  kimarijiChange: boolean,
  read: readonly PoemId[],
): CandidateSet {
  return CandidateSet.afterReading(kimarijiChange ? read : []);
}

/** The rows of the kimariji list, in both orders. */
export function kimarijiRows(list: {
  readonly targets: readonly PoemId[];
  readonly results: readonly CardResult[];
  readonly kimarijiChange: boolean;
}): Record<ListOrder, KimarijiRow[]> {
  const finished = new Map(list.results.map((result) => [result.poem, result]));
  const now = candidatesAfter(
    list.kimarijiChange,
    list.results.map((result) => result.poem),
  );
  const row = (poem: PoemId): KimarijiRow => {
    const result = finished.get(poem);
    const kimarijiNow = result === undefined ? kimariji(poem, now) : "";
    return {
      poem,
      kimariji: staticKimariji(poem),
      status: result?.outcome ?? "unread",
      changed: result?.changed ?? kimarijiNow !== staticKimariji(poem),
    };
  };
  const targets = new Set(list.targets);
  return {
    kimariji: POEMS.map((poem) => poem.id)
      .filter((poem) => targets.has(poem))
      .map(row),
    asked: list.results.map((result) => row(result.poem)),
  };
}
