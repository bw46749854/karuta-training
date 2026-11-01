import type { PoemId } from "./poem-id";
import { PREFIX_GROUPS, type PrefixGroup } from "./prefix-groups";
import { excludingDeadCards } from "./question-targets";
import { shuffle, type RandomInt } from "./random";

export type PlacementMode = "group" | "individual" | "mixed";

export type PlacementQuestion =
  | { readonly kind: "group"; readonly group: PrefixGroup }
  | { readonly kind: "individual"; readonly poem: PoemId };

function forMode(
  mode: PlacementMode,
  groups: readonly PlacementQuestion[],
  individuals: readonly PlacementQuestion[],
): PlacementQuestion[] {
  switch (mode) {
    case "group":
      return [...groups];
    case "individual":
      return [...individuals];
    case "mixed":
      return [...groups, ...individuals];
  }
}

/** 配置暗記 (spec 03 §7): every question once, in random order. */
export function placementQuestions(
  settings: {
    readonly targets: readonly PoemId[];
    readonly onBoard: readonly PoemId[];
    readonly mode: PlacementMode;
    readonly excludeDead: boolean;
  },
  random: RandomInt,
): PlacementQuestion[] {
  const { targets, onBoard, excludeDead } = settings;
  const isTarget = (poem: PoemId) => targets.includes(poem);
  const isOnBoard = (poem: PoemId) => onBoard.includes(poem);
  const groups = PREFIX_GROUPS.filter(
    (group) =>
      group.poems.some(isTarget) &&
      (!excludeDead || group.poems.some(isOnBoard)),
  ).map((group): PlacementQuestion => ({ kind: "group", group }));
  const individuals = excludingDeadCards(targets, onBoard, excludeDead).map(
    (poem): PlacementQuestion => ({ kind: "individual", poem }),
  );
  return shuffle(forMode(settings.mode, groups, individuals), random);
}
