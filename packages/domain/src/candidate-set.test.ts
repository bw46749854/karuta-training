import fc from "fast-check";
import { expect, test } from "vitest";
import { CandidateSet } from "./candidate-set";
import type { PoemId } from "./poem-id";
import { POEMS } from "./poems";

const ALL = POEMS.map((poem) => poem.id);

function ascending(ids: readonly PoemId[]): PoemId[] {
  return ids.toSorted((a, b) => a - b);
}

function idsOf(candidates: CandidateSet): PoemId[] {
  return ascending(candidates.poems.map((poem) => poem.id));
}

test("仕様 01 §6.2 何も読まれていなければ、候補集合は100首", () => {
  expect(idsOf(CandidateSet.afterReading([]))).toEqual(ascending(ALL));
});

test("仕様 01 §5.1 §6.2 候補集合は、100首から既読の歌を除いたもの", () => {
  fc.assert(
    fc.property(fc.shuffledSubarray(ALL), (read) => {
      const unread = ALL.filter((id) => !read.includes(id));
      expect(idsOf(CandidateSet.afterReading(read))).toEqual(ascending(unread));
    }),
  );
});
