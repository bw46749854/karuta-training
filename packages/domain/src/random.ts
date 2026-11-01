import { itemAt } from "./item-at";

/**
 * Returns an integer from 0 up to, but not including, bound. Every integer
 * in that range is equally likely (ADR-0002 §1).
 */
export type RandomInt = (bound: number) => number;

/**
 * Fisher–Yates shuffle (ADR-0002 §4): from the back, swap each place with a
 * place chosen from those not yet fixed. Returns a new array.
 */
export function shuffle<T>(items: readonly T[], random: RandomInt): T[] {
  const result = [...items];
  // Stryker disable next-line EqualityOperator: with ">=" the loop also asks for a choice out of 1, which swaps the first item with itself, so that mutant shuffles the same. The other operators here were checked to be killed (2026-11-01).
  for (let last = result.length - 1; last > 0; last -= 1) {
    const chosen = random(last + 1);
    const swapped = itemAt(result, chosen);
    result[chosen] = itemAt(result, last);
    result[last] = swapped;
  }
  return result;
}
