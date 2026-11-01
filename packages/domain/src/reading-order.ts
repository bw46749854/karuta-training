import type { PoemId } from "./poem-id";
import { excludingDeadCards } from "./question-targets";
import { shuffle, type RandomInt } from "./random";

/** 実践練習 (spec 03 §8): the poems to read, each once, in random order. */
export function readingOrder(
  settings: {
    readonly targets: readonly PoemId[];
    readonly onBoard: readonly PoemId[];
    readonly excludeDead: boolean;
  },
  random: RandomInt,
): PoemId[] {
  return shuffle(
    excludingDeadCards(
      settings.targets,
      settings.onBoard,
      settings.excludeDead,
    ),
    random,
  );
}
