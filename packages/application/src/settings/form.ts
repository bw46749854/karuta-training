import {
  BOARD_SHAPES,
  POEMS,
  PREFIX_GROUPS,
  type BoardShape,
  type PoemId,
} from "@karuta/domain";
import { SETTINGS, type Settings } from "./definition";
import type { SettingsEditor } from "./editor";
import { fieldOf, fieldsOf, type ItemForm } from "./items";

// What the settings screen shows, made from the definition (spec 04 §10).

/**
 * "group.item" of every on/off, whole-number and choice item. The wording
 * table names each of them, so one left out is a type error (ADR-0005 §2).
 */
export type FieldPath = {
  [Group in keyof Settings]: {
    [Name in keyof Settings[Group]]: Settings[Group][Name] extends
      boolean | number | string
      ? `${Group}.${Name & string}`
      : never;
  }[keyof Settings[Group]];
}[keyof Settings];

/** Every option of the choice items, which the wording table names too. */
export type ChoiceOption = {
  [Group in keyof Settings]: Extract<
    Settings[Group][keyof Settings[Group]],
    string
  >;
}[keyof Settings];

/** One input of an on/off, whole-number or choice item. */
export type FormField =
  | { readonly kind: "flag"; readonly path: string; readonly value: boolean }
  | {
      readonly kind: "integer";
      readonly path: string;
      readonly value: number;
      readonly min: number;
      readonly max: number;
      readonly invalid: boolean;
    }
  | {
      readonly kind: "choice";
      readonly path: string;
      readonly value: string;
      readonly options: readonly string[];
    };

export interface FormSection {
  readonly name: string;
  readonly fields: readonly FormField[];
}

function formField(field: {
  readonly path: string;
  readonly form: ItemForm;
  readonly value: unknown;
  readonly invalid: boolean;
}): FormField[] {
  // The draft holds only values that passed the item's check (ADR-0003 §8),
  // so each value is already of its item's kind.
  const { path, form, value, invalid } = field;
  switch (form.kind) {
    case "flag":
      return [{ kind: "flag", path, value: value === true }];
    case "integer":
      return [{ ...form, path, value: Number(value), invalid }];
    case "choice":
      return [{ ...form, path, value: String(value) }];
    case "poems":
    case "layouts":
    case "group":
      // Spec 04 §10: these have their own parts on the screen.
      return [];
  }
}

/** The inputs of each group of items, in the order of the definition. */
export function settingsForm(editor: SettingsEditor): FormSection[] {
  return fieldsOf(SETTINGS.form).map((section) => ({
    name: section.name,
    fields: fieldsOf(section.item.form).flatMap((field) => {
      const path = `${section.name}.${field.name}`;
      const value = fieldOf(fieldOf(editor.draft, section.name), field.name);
      return formField({
        path,
        form: field.item.form,
        value,
        invalid: editor.invalid.includes(path),
      });
    }),
  }));
}

/** The lists of spec 04 §6, in the order of the kimariji table. */
export interface PoemSelectionView {
  readonly groups: readonly {
    readonly name: string;
    readonly selected: boolean;
  }[];
  readonly poems: readonly {
    readonly id: PoemId;
    readonly kimariji: string;
    readonly selected: boolean;
  }[];
}

export function poemSelection(settings: Settings): PoemSelectionView {
  const selected = new Set(settings.common.selected);
  return {
    groups: PREFIX_GROUPS.map((group) => ({
      name: group.name,
      selected: group.poems.every((poem) => selected.has(poem)),
    })),
    poems: POEMS.map((poem) => ({
      id: poem.id,
      kimariji: poem.staticKimariji,
      selected: selected.has(poem.id),
    })),
  };
}

/** Spec 04 §8.1: the shapes whose layout can be edited, in this order. */
export const LAYOUT_SHAPES: readonly BoardShape[] = BOARD_SHAPES;
