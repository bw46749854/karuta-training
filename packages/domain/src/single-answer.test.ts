import fc from "fast-check";
import { expect, test } from "vitest";
import { CandidateSet } from "./candidate-set";
import { kimariji } from "./kimariji";
import { poemId } from "./poem-id";
import { POEMS } from "./poems";
import { judgeSingleAnswer, type SingleAnswerResult } from "./single-answer";
import vectors from "./vectors/single-answer.json" with { type: "json" };

interface Vector {
  readonly description: string;
  readonly poem: number;
  readonly read: readonly number[];
  readonly input: string;
  readonly romajiAllowed: boolean;
  readonly expected: string;
  readonly reason?: string;
}

const VECTORS: readonly Vector[] = vectors;

// Spec 02 §2: what a person may add around or inside a right answer.
const EXTRAS = [" ", "　", ",", "，", "、", "\t"];

function reasonOf(result: SingleAnswerResult): string | undefined {
  return result.kind === "judged" && result.answer.kind === "unconvertible"
    ? result.answer.reason
    : undefined;
}

test.each(VECTORS)("仕様 02 §2 §6.1 $description", (vector) => {
  const candidates = CandidateSet.afterReading(vector.read.map(poemId));
  const result = judgeSingleAnswer(
    vector.input,
    kimariji(poemId(vector.poem), candidates),
    vector.romajiAllowed,
  );
  if (vector.expected === "not-accepted") {
    expect(result).toEqual({ kind: "not-accepted" });
    return;
  }
  expect(result.kind === "judged" && result.correct).toBe(
    vector.expected === "correct",
  );
  expect(reasonOf(result)).toBe(vector.reason);
});

test("仕様 02 §8.2 S1 札流し：正解の入力の、前・後ろ・途中のどこに空白や区切りを足しても、不正解", () => {
  const cases = fc.record({
    poem: fc.constantFrom(...POEMS),
    extra: fc.string({ unit: fc.constantFrom(...EXTRAS), minLength: 1 }),
    at: fc.nat(),
  });
  fc.assert(
    fc.property(cases, ({ poem, extra, at }) => {
      const characters = Array.from(poem.staticKimariji);
      const index = at % (characters.length + 1);
      characters.splice(index, 0, extra);
      const result = judgeSingleAnswer(
        characters.join(""),
        poem.staticKimariji,
        true,
      );
      expect(result).toMatchObject({ kind: "judged", correct: false });
    }),
  );
});
