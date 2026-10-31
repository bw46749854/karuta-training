import type { CandidateSet } from "./candidate-set";
import type { PoemId } from "./poem-id";

/**
 * How many characters two strings share from the start, counting one code
 * point as one character (LCP in spec 01 §4.1, characters as in §3).
 */
export function commonPrefixLength(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  let length = 0;
  while (length < x.length && x[length] === y[length]) {
    length += 1;
  }
  return length;
}

/**
 * The shortest start of the poem's static kimariji that tells it apart from
 * every other candidate (spec 01 §4.1). The poem must be a candidate.
 */
export function kimariji(poem: PoemId, candidates: CandidateSet): string {
  const own = candidates.poems.find((candidate) => candidate.id === poem);
  if (own === undefined) {
    throw new RangeError(`Poem ${String(poem)} is not a candidate`);
  }
  const longest = Math.max(
    0,
    ...candidates.poems
      .filter((other) => other !== own)
      .map((other) =>
        commonPrefixLength(own.staticKimariji, other.staticKimariji),
      ),
  );
  // slice() stops at the end of the static kimariji, which is the min() of
  // the formula in §4.1.
  return Array.from(own.staticKimariji)
    .slice(0, longest + 1)
    .join("");
}
