import { itemAt } from "./item-at";
import type { PoemId } from "./poem-id";
import { shuffle, type RandomInt } from "./random";

export type Orientation = "upright" | "upside-down";
export type OrientationSetting = Orientation | "random";

const ORIENTATIONS: readonly Orientation[] = ["upright", "upside-down"];

export interface SingleCardQuestion {
  readonly poem: PoemId;
  readonly orientation: Orientation;
}

export interface MultipleCardQuestion {
  readonly poems: readonly PoemId[];
  readonly orientation: Orientation;
}

// Spec 03 §4: when random, each call decides on its own, half and half.
function orientationFor(
  setting: OrientationSetting,
  random: RandomInt,
): Orientation {
  if (setting !== "random") {
    return setting;
  }
  return itemAt(ORIENTATIONS, random(ORIENTATIONS.length));
}

/** 札流し (spec 03 §4): one card per question, in random order. */
export function singleCardQuestions(
  settings: {
    readonly targets: readonly PoemId[];
    readonly count: number;
    readonly orientation: OrientationSetting;
  },
  random: RandomInt,
): SingleCardQuestion[] {
  return shuffle(settings.targets, random)
    .slice(0, settings.count)
    .map((poem) => ({
      poem,
      orientation: orientationFor(settings.orientation, random),
    }));
}

/**
 * 複数枚 (spec 03 §5): the cards are chosen as for 札流し, then cut into
 * questions of perQuestion cards; the last question takes what is left.
 */
export function multipleCardQuestions(
  settings: {
    readonly targets: readonly PoemId[];
    readonly count: number;
    readonly perQuestion: number;
    readonly orientation: OrientationSetting;
  },
  random: RandomInt,
): MultipleCardQuestion[] {
  const { perQuestion } = settings;
  const cards = shuffle(settings.targets, random).slice(0, settings.count);
  return Array.from(
    { length: Math.ceil(cards.length / perQuestion) },
    (_, index) => ({
      poems: cards.slice(index * perQuestion, (index + 1) * perQuestion),
      orientation: orientationFor(settings.orientation, random),
    }),
  );
}
