import type { PoemId } from "./poem-id";
import { POEMS, type Poem } from "./poems";

/**
 * The poems that can still be read (spec 01 §6). It is always all 100 poems
 * less the read ones (§6.2), never only the poems chosen for practice, so it
 * can only be made by afterReading().
 */
export class CandidateSet {
  readonly #poems: readonly Poem[];

  private constructor(poems: readonly Poem[]) {
    this.#poems = poems;
  }

  static afterReading(read: Iterable<PoemId>): CandidateSet {
    const readIds = new Set(read);
    return new CandidateSet(POEMS.filter((poem) => !readIds.has(poem.id)));
  }

  get poems(): readonly Poem[] {
    return this.#poems;
  }
}
