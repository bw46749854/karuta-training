import { expect, test } from "vitest";
import { CandidateSet } from "./candidate-set";
import { commonPrefixLength, kimariji } from "./kimariji";
import { poemId } from "./poem-id";
import { POEMS } from "./poems";
import candidateSetVectors from "./vectors/candidate-set.json" with { type: "json" };
import kimarijiChangeVectors from "./vectors/kimariji-change.json" with { type: "json" };

interface Vector {
  readonly description: string;
  readonly read: readonly number[];
  readonly poem: number;
  readonly expectedKimariji: string;
}

const KIMARIJI_CHANGE: readonly Vector[] = kimarijiChangeVectors;
const CANDIDATE_SET: readonly Vector[] = candidateSetVectors;

function kimarijiIn(vector: Vector): string {
  const candidates = CandidateSet.afterReading(vector.read.map(poemId));
  return kimariji(poemId(vector.poem), candidates);
}

test.each(KIMARIJI_CHANGE)("仕様 01 §5.2 $description", (vector) => {
  expect(kimarijiIn(vector)).toBe(vector.expectedKimariji);
});

test.each(CANDIDATE_SET)("仕様 01 §6.3 $description", (vector) => {
  expect(kimarijiIn(vector)).toBe(vector.expectedKimariji);
});

test("仕様 01 §4.1 100首すべてが候補なら、決まり字は静的決まり字そのもの", () => {
  const all = CandidateSet.afterReading([]);
  const differing = POEMS.filter(
    (poem) => kimariji(poem.id, all) !== poem.staticKimariji,
  );
  expect(differing).toEqual([]);
});

test("仕様 01 §4.1 候補集合にない歌の決まり字は求めず、誤りとして失敗する", () => {
  const candidates = CandidateSet.afterReading([poemId(65)]);
  expect(() => kimariji(poemId(65), candidates)).toThrow(
    new RangeError("Poem 65 is not a candidate"),
  );
});

test.each<[string, string, number]>([
  ["うか", "うら", 1],
  ["む", "す", 0],
  ["あさじ", "あさぼらけあ", 2],
  ["あさ", "あさじ", 2],
  ["あさじ", "あさ", 2],
  ["あさ", "あさ", 2],
  ["", "あ", 0],
  ["𠮷あ", "𠮷い", 1],
])("仕様 01 §3 §4.1 「%s」と「%s」の LCP は %i", (a, b, expected) => {
  expect(commonPrefixLength(a, b)).toBe(expected);
});
