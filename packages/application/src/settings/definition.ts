import { flag, group, layoutsByShape, poemIds } from "./items";

// The one definition of the settings (ADR-0003 §1). Items are added with
// the specs of the screens that use them (stage 4). Default values are
// provisional until stage 5, except the layouts, which are decided.
export const SETTINGS = group((field) => ({
  common: field(
    "common",
    group((item) => ({
      // Manual §1.1: limiting is on on the settings screen at first.
      limited: item("limited", flag(true)),
      selected: item("selected", poemIds([])),
      layouts: item("layouts", layoutsByShape()),
    })),
  ),
}));

export type Settings = typeof SETTINGS.defaultValue;

export const DEFAULT_SETTINGS: Settings = SETTINGS.defaultValue;
