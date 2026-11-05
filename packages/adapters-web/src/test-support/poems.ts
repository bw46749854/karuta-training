// Test code only: a poem id picked by its number.
import { POEMS, type PoemId } from "@karuta/domain";

export function poemIdForTest(number: number): PoemId {
  const poem = POEMS.find((candidate) => candidate.id === number);
  if (poem === undefined) {
    throw new RangeError(`No poem ${String(number)}`);
  }
  return poem.id;
}
