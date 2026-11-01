// Random sources for tests (ADR-0002 §5). Test code only: it is left out of
// coverage and mutation testing.
import type { RandomInt } from "../random";

/** Always chooses 0. */
export const firstChoice: RandomInt = () => 0;

/** Chooses from the given values in turn, each taken modulo the bound. */
export function randomFrom(values: readonly number[]): RandomInt {
  let taken = 0;
  return (bound) => {
    const value =
      values.length === 0 ? 0 : (values[taken % values.length] ?? 0);
    taken += 1;
    return Math.abs(value) % bound;
  };
}

/**
 * Runs run once for every possible sequence of choices it asks for, and
 * returns every outcome. With a fair random source, each outcome in the list
 * is equally likely.
 */
export function allOutcomes<T>(run: (random: RandomInt) => T): T[] {
  const outcomes: T[] = [];
  let path: readonly number[] = [];
  for (;;) {
    const bounds: number[] = [];
    const taken: number[] = [];
    outcomes.push(
      run((bound) => {
        const value = path[taken.length] ?? 0;
        bounds.push(bound);
        taken.push(value);
        return value;
      }),
    );
    const last = taken.findLastIndex(
      (value, index) => value + 1 < (bounds[index] ?? 0),
    );
    if (last === -1) {
      return outcomes;
    }
    path = [...taken.slice(0, last), (taken[last] ?? 0) + 1];
  }
}
