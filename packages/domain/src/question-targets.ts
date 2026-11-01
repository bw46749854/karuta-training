import type { PoemId } from "./poem-id";
import { POEMS } from "./poems";

/**
 * The poems to practise with (spec 03 §2): the selected poems when limiting
 * is on and at least one is selected, otherwise all 100.
 */
export function questionTargets(
  limited: boolean,
  selected: readonly PoemId[],
): PoemId[] {
  const chosen = new Set(selected);
  const onlyChosen = limited && chosen.size > 0;
  return POEMS.map((poem) => poem.id).filter(
    (id) => !onlyChosen || chosen.has(id),
  );
}

/**
 * The targets, less the ones not on the board when dead cards are excluded
 * (spec 03 §7, §8).
 */
export function excludingDeadCards(
  targets: readonly PoemId[],
  onBoard: readonly PoemId[],
  excludeDead: boolean,
): PoemId[] {
  const board = new Set(onBoard);
  return targets.filter((poem) => !excludeDead || board.has(poem));
}
