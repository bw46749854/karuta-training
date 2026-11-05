import {
  POEMS,
  PREFIX_GROUPS,
  type BoardShape,
  type PoemId,
} from "@karuta/domain";
import type { SettingsRepository } from "../ports";
import { DEFAULT_SETTINGS, SETTINGS, type Settings } from "./definition";
import { readSettingsDocument, saveSettings } from "./document";
import { fieldOf, layoutFor, withField, withLayout, type Item } from "./items";

/** The settings screen's saved values and the draft being edited (ADR-0003 §6). */
export interface SettingsEditor {
  readonly saved: Settings;
  readonly draft: Settings;
  /** The integer items whose input is not accepted, by path (spec 04 §7). */
  readonly invalid: readonly string[];
}

export function startEditing(saved: Settings): SettingsEditor {
  return { saved, draft: saved, invalid: [] };
}

/** Spec 04 §7.3: nothing can be saved while an input is not accepted. */
export function canSave(editor: SettingsEditor): boolean {
  return editor.invalid.length === 0;
}

/** The item at "section.name" in the definition. Any other path is a bug. */
function definedItem(path: string): {
  readonly section: string;
  readonly name: string;
  readonly item: Item<unknown>;
} {
  const [section = "", name = "", ...rest] = path.split(".");
  const sections = SETTINGS.form.kind === "group" ? SETTINGS.form.fields : [];
  const form = sections.find((field) => field.name === section)?.item.form;
  const found =
    form?.kind === "group"
      ? form.fields.find((field) => field.name === name)
      : undefined;
  if (found === undefined || rest.length > 0) {
    throw new RangeError(`No setting edited as a field at ${path}`);
  }
  return { section, name, item: found.item };
}

// Spec 04 §7.1: only half-width digits make a whole number.
const DIGITS = /^[0-9]+$/;

function inputValue(item: Item<unknown>, input: boolean | string): unknown {
  switch (item.form.kind) {
    case "flag":
    case "choice":
      return input;
    case "integer":
      return typeof input === "string" && DIGITS.test(input)
        ? Number(input)
        : undefined;
    case "poems":
    case "layouts":
    case "group":
      throw new RangeError("This item has its own editing operations");
  }
}

/**
 * Changes one on/off, whole-number or choice item (spec 04 §4.4). Only a
 * value that passes the item's check gets into the draft (ADR-0003 §8). A
 * whole number that is not accepted is kept as invalid (spec 04 §7.2).
 */
export function editField(
  editor: SettingsEditor,
  path: string,
  input: boolean | string,
): SettingsEditor {
  const { section, name, item } = definedItem(path);
  const value = item.read(inputValue(item, input));
  const others = editor.invalid.filter((invalid) => invalid !== path);
  if (value !== undefined) {
    const sectionValue = withField(fieldOf(editor.draft, section), name, value);
    const draft = readSettingsDocument({
      settings: withField(editor.draft, section, sectionValue),
    });
    return { ...editor, draft, invalid: others };
  }
  if (item.form.kind === "integer" && typeof input === "string") {
    return { ...editor, invalid: [...others, path] };
  }
  return editor;
}

const IN_ORDER = POEMS.map((poem) => poem.id);

function withSelected(
  editor: SettingsEditor,
  selected: ReadonlySet<PoemId>,
): SettingsEditor {
  const { draft } = editor;
  const ids = IN_ORDER.filter((id) => selected.has(id));
  return {
    ...editor,
    draft: { ...draft, common: { ...draft.common, selected: ids } },
  };
}

/** Spec 04 §6.4: selects the poem, or leaves it out when it is selected. */
export function togglePoem(
  editor: SettingsEditor,
  poem: PoemId,
): SettingsEditor {
  const selected = new Set(editor.draft.common.selected);
  if (!selected.delete(poem)) {
    selected.add(poem);
  }
  return withSelected(editor, selected);
}

/** Spec 04 §6.2: all the group's poems, or none when all are selected. */
export function toggleGroup(
  editor: SettingsEditor,
  name: string,
): SettingsEditor {
  const group = PREFIX_GROUPS.find((candidate) => candidate.name === name);
  if (group === undefined) {
    throw new RangeError(`No kimariji group ${name}`);
  }
  const selected = new Set(editor.draft.common.selected);
  const all = group.poems.every((poem) => selected.has(poem));
  for (const poem of group.poems) {
    if (all) {
      selected.delete(poem);
    } else {
      selected.add(poem);
    }
  }
  return withSelected(editor, selected);
}

/** Spec 04 §6.5. */
export function selectAllPoems(editor: SettingsEditor): SettingsEditor {
  return withSelected(editor, new Set(IN_ORDER));
}

/** Spec 04 §6.5. */
export function clearPoems(editor: SettingsEditor): SettingsEditor {
  return withSelected(editor, new Set());
}

/** Spec 04 §8.3: uses the cell, or stops using it, in that shape only. */
export function toggleCell(
  editor: SettingsEditor,
  shape: BoardShape,
  index: number,
): SettingsEditor {
  const { draft } = editor;
  const { used } = layoutFor(draft.common.layouts, shape);
  if (index < 0 || index >= used.length) {
    throw new RangeError(`No cell ${String(index)} on the board`);
  }
  const next = used.map((cell, at) => (at === index ? !cell : cell));
  const layouts = withLayout(draft.common.layouts, shape, next);
  return {
    ...editor,
    draft: { ...draft, common: { ...draft.common, layouts } },
  };
}

/** Manual §6.4: reset puts the defaults on the screen and does not save. */
export function resetDraft(editor: SettingsEditor): SettingsEditor {
  return { ...editor, draft: DEFAULT_SETTINGS, invalid: [] };
}

/** Manual §6.4: leaving without saving throws the changes away. */
export function discardDraft(editor: SettingsEditor): SettingsEditor {
  return startEditing(editor.saved);
}

/** Saves the draft. When saving fails, nothing changes. */
export async function saveDraft(
  editor: SettingsEditor,
  repository: SettingsRepository,
): Promise<{
  readonly editor: SettingsEditor;
  readonly result: "saved" | "failed";
}> {
  const result = await saveSettings(repository, editor.draft);
  return {
    editor: result === "saved" ? startEditing(editor.draft) : editor,
    result,
  };
}
