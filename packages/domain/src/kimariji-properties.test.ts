import fc from "fast-check";
import { expect, test } from "vitest";
import { CandidateSet } from "./candidate-set";
import { kimariji } from "./kimariji";
import type { PoemId } from "./poem-id";
import { POEMS, type Poem } from "./poems";

const ALL = POEMS.map((poem) => poem.id);

// Spec 01 §3: one character is one code point.
function lengthOf(text: string): number {
  return Array.from(text).length;
}

function unread(read: readonly PoemId[]): PoemId[] {
  return ALL.filter((id) => !read.includes(id));
}

function othersStartingWith(
  candidates: CandidateSet,
  poem: PoemId,
  start: string,
): Poem[] {
  return candidates.poems.filter(
    (other) => other.id !== poem && other.staticKimariji.startsWith(start),
  );
}

// Poems read early, midway and late in a game: a few, about half, or most.
// At least one poem is left unread.
const readPoems = fc
  .oneof(
    fc.subarray(ALL),
    fc
      .array(fc.boolean(), { minLength: 100, maxLength: 100 })
      .map((mask) => ALL.filter((_, index) => mask[index] === true)),
    fc.subarray(ALL).map(unread),
  )
  .filter((read) => read.length < 100);

// A candidate set, given by the read poems, and a poem in it.
const situation = readPoems.chain((read) =>
  fc.record({
    read: fc.constant(read),
    poem: fc.constantFrom(...unread(read)),
  }),
);

test("仕様 01 §4.1 決まり字は、静的決まり字の先頭の1文字以上", () => {
  fc.assert(
    fc.property(situation, ({ read, poem }) => {
      const candidates = CandidateSet.afterReading(read);
      const own = candidates.poems.find((p) => p.id === poem);
      const result = kimariji(poem, candidates);
      expect(lengthOf(result)).toBeGreaterThanOrEqual(1);
      expect(own?.staticKimariji.startsWith(result)).toBe(true);
    }),
  );
});

test("仕様 01 §8.2 P1 一意性：決まり字は、候補のほかのどの歌の静的決まり字の先頭部分にもならない", () => {
  fc.assert(
    fc.property(situation, ({ read, poem }) => {
      const candidates = CandidateSet.afterReading(read);
      const result = kimariji(poem, candidates);
      expect(othersStartingWith(candidates, poem, result)).toEqual([]);
    }),
  );
});

test("仕様 01 §8.2 P2 最短性：2文字以上の決まり字は、1文字短くすると、候補のほかのある歌の静的決まり字の先頭部分になる", () => {
  fc.assert(
    fc.property(situation, ({ read, poem }) => {
      const candidates = CandidateSet.afterReading(read);
      const head = Array.from(kimariji(poem, candidates)).slice(0, -1).join("");
      if (head !== "") {
        expect(othersStartingWith(candidates, poem, head)).not.toEqual([]);
      }
    }),
  );
});

test("仕様 01 §8.2 P3 単調性：候補が減っても、決まり字は長くならない", () => {
  const nested = readPoems.chain((more) =>
    fc.record({
      fewer: fc.subarray(more),
      more: fc.constant(more),
      poem: fc.constantFrom(...unread(more)),
    }),
  );
  fc.assert(
    fc.property(nested, ({ fewer, more, poem }) => {
      const before = kimariji(poem, CandidateSet.afterReading(fewer));
      const after = kimariji(poem, CandidateSet.afterReading(more));
      expect(lengthOf(after)).toBeLessThanOrEqual(lengthOf(before));
    }),
  );
});

test("仕様 01 §8.2 P4 候補が1首だけなら、決まり字は1文字", () => {
  const notOneCharacter = ALL.filter((poem) => {
    const onlyThis = CandidateSet.afterReading(unread([poem]));
    return lengthOf(kimariji(poem, onlyThis)) !== 1;
  });
  expect(notOneCharacter).toEqual([]);
});
