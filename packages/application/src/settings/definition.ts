import type { OrientationSetting, PlacementMode } from "@karuta/domain";
import { choice, flag, group, integer, layoutsByShape, poemIds } from "./items";

// The one definition of the settings (ADR-0003 §1), in the order of the
// settings screen (spec 04 §4.2, §5). Default values are provisional until
// stage 5, except the layouts, which are decided (spec 03 §6.1).

const ORIENTATIONS: readonly OrientationSetting[] = [
  "random",
  "upright",
  "upside-down",
];

const PLACEMENT_MODES: readonly PlacementMode[] = [
  "mixed",
  "individual",
  "group",
];

const AFTER_ANSWER = ["always", "never", "when-correct", "when-wrong"] as const;

/** When something happens after an answer in 配置暗記 (manual §4.3). */
export type AfterAnswer = (typeof AFTER_ANSWER)[number];

// Manual §2.3 and the like: 1 to 9999 milliseconds, 500 at first.
const milliseconds = () => integer(1, 9999, 500);

// Manual §1.1: limiting is on on the settings screen at first.
const common = () =>
  group((item) => ({
    limited: item("limited", flag(true)),
    selected: item("selected", poemIds([])),
    layouts: item("layouts", layoutsByShape()),
  }));

// Manual §2.3.
const cardFlow = () =>
  group((item) => ({
    orientation: item("orientation", choice(ORIENTATIONS, "random")),
    romajiAllowed: item("romajiAllowed", flag(true)),
    kimarijiChange: item("kimarijiChange", flag(true)),
    autoNext: item("autoNext", flag(false)),
    waitMs: item("waitMs", milliseconds()),
    count: item("count", integer(1, 100, 100)),
  }));

// Manual §3.3. Kimariji change is off as standard there.
const multiple = () =>
  group((item) => ({
    orientation: item("orientation", choice(ORIENTATIONS, "random")),
    romajiAllowed: item("romajiAllowed", flag(true)),
    kimarijiChange: item("kimarijiChange", flag(false)),
    autoNext: item("autoNext", flag(false)),
    waitMs: item("waitMs", milliseconds()),
    count: item("count", integer(1, 100, 100)),
    perQuestion: item("perQuestion", integer(2, 6, 5)),
    displayMs: item("displayMs", milliseconds()),
  }));

// Manual §4.3.
const placement = () =>
  group((item) => ({
    mode: item("mode", choice(PLACEMENT_MODES, "group")),
    excludeDead: item("excludeDead", flag(true)),
    showAnswer: item("showAnswer", choice(AFTER_ANSWER, "when-correct")),
    allowCheck: item("allowCheck", choice(AFTER_ANSWER, "when-correct")),
    autoNext: item("autoNext", flag(false)),
    waitMs: item("waitMs", milliseconds()),
  }));

// Manual §5.3.
const play = () =>
  group((item) => ({
    excludeDead: item("excludeDead", flag(true)),
    letterIntervalMs: item("letterIntervalMs", milliseconds()),
    autoNext: item("autoNext", flag(false)),
    waitMs: item("waitMs", milliseconds()),
  }));

export const SETTINGS = group((field) => ({
  common: field("common", common()),
  cardFlow: field("cardFlow", cardFlow()),
  multiple: field("multiple", multiple()),
  placement: field("placement", placement()),
  play: field("play", play()),
}));

export type Settings = typeof SETTINGS.defaultValue;

export const DEFAULT_SETTINGS: Settings = SETTINGS.defaultValue;
