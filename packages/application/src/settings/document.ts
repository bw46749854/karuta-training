import type { SettingsRepository } from "../ports";
import { DEFAULT_SETTINGS, SETTINGS, type Settings } from "./definition";
import { fieldOf } from "./items";

/**
 * The version of the saved document. Raise it only for a change that old
 * documents cannot be read across, and add a migration with its tests
 * (ADR-0003 §5). Adding an item does not raise it.
 */
export const SETTINGS_VERSION = 1;

/** The document to save. */
export function settingsDocument(settings: Settings): unknown {
  return { version: SETTINGS_VERSION, settings };
}

/**
 * The settings in a saved document. Never saved, or broken, gives the
 * defaults; a missing or invalid item gives that item's default (ADR-0003 §4).
 */
export function readSettingsDocument(document: unknown): Settings {
  return SETTINGS.read(fieldOf(document, "settings")) ?? DEFAULT_SETTINGS;
}

export async function loadSettings(
  repository: SettingsRepository,
): Promise<Settings> {
  return readSettingsDocument(await repository.load());
}

export function saveSettings(
  repository: SettingsRepository,
  settings: Settings,
): Promise<"saved" | "failed"> {
  return repository.save(settingsDocument(settings));
}
