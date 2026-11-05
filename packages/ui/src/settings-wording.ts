import { WORDING } from "./wording";

// Looks the settings screen's words up by the names in the definition. A
// name with no words is a bug, which the settings screen's tests catch.

function wordsFor(table: Readonly<Record<string, string>>, name: string) {
  const words = table[name];
  if (words === undefined) {
    throw new RangeError(`No wording for ${name}`);
  }
  return words;
}

export const sectionTitle = (name: string): string =>
  wordsFor(WORDING.settings.sections, name);

export const itemLabel = (path: string): string =>
  wordsFor(WORDING.settings.items, path);

export const optionLabel = (option: string): string =>
  wordsFor(WORDING.settings.options, option);
