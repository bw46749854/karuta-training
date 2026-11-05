import {
  boardShape,
  defaultLayout,
  POEMS,
  type BoardShape,
  type Layout,
  type PoemId,
} from "@karuta/domain";

// The parts the settings definition is written with (ADR-0003 §1). Each
// part gives the type, the default and the check of one item together, so
// no item can have one without the others.

/** How the settings screen edits an item (spec 04 §10). */
export type ItemForm =
  | { readonly kind: "flag" }
  | { readonly kind: "integer"; readonly min: number; readonly max: number }
  | { readonly kind: "choice"; readonly options: readonly string[] }
  | { readonly kind: "poems" }
  | { readonly kind: "layouts" }
  | { readonly kind: "group"; readonly fields: readonly NamedItem[] };

/** One setting: its default, and how to read it from a saved document. */
export interface Item<T> {
  readonly defaultValue: T;
  /** The value, or undefined when it is missing or not valid. */
  read(saved: unknown): T | undefined;
  readonly form: ItemForm;
}

/** An item of a group, under its name. */
export interface NamedItem {
  readonly name: string;
  readonly item: Item<unknown>;
}

/** Gives the value of one named item in a group. */
export type Field = <T>(name: string, item: Item<T>) => T;

type ByShape<T> = Readonly<
  Record<BoardShape["rows"], Readonly<Record<BoardShape["columns"], T>>>
>;

/** Which cells are used, for each board shape (ADR-0007 §4). */
export type LayoutsByShape = ByShape<readonly boolean[]>;

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The saved value of the named item, if the saved object has one. */
export function fieldOf(saved: unknown, name: string): unknown {
  if (!isRecord(saved) || !Object.hasOwn(saved, name)) {
    return undefined;
  }
  const value: unknown = Reflect.get(saved, name);
  return value;
}

/** The object with one named value put in, in place of any before. */
export function withField(
  saved: unknown,
  name: string,
  value: unknown,
): object {
  return { ...(isRecord(saved) ? saved : {}), [name]: value };
}

/** An item that is on or off. */
export function flag(defaultValue: boolean): Item<boolean> {
  return {
    defaultValue,
    read: (saved) => (typeof saved === "boolean" ? saved : undefined),
    form: { kind: "flag" },
  };
}

/** An item that is a whole number from min to max. */
export function integer(
  min: number,
  max: number,
  defaultValue: number,
): Item<number> {
  return {
    defaultValue,
    read: (saved) =>
      typeof saved === "number" &&
      Number.isInteger(saved) &&
      saved >= min &&
      saved <= max
        ? saved
        : undefined,
    form: { kind: "integer", min, max },
  };
}

/** An item that is one of the options, shown in their order. */
export function choice<const T extends string>(
  options: readonly T[],
  defaultValue: NoInfer<T>,
): Item<T> {
  return {
    defaultValue,
    read: (saved) => options.find((option) => option === saved),
    form: { kind: "choice", options },
  };
}

const POEM_ID_OF = new Map<number, PoemId>(
  POEMS.map((poem) => [poem.id, poem.id]),
);

function poemIdOf(value: unknown): PoemId | undefined {
  return typeof value === "number" ? POEM_ID_OF.get(value) : undefined;
}

/** An item that is some poems, each at most once. */
export function poemIds(
  defaultValue: readonly PoemId[],
): Item<readonly PoemId[]> {
  return {
    defaultValue,
    read: (saved) => {
      if (!Array.isArray(saved)) {
        return undefined;
      }
      const ids = saved.map(poemIdOf).filter((id) => id !== undefined);
      const valid =
        ids.length === saved.length && new Set(ids).size === ids.length;
      return valid ? ids : undefined;
    },
    form: { kind: "poems" },
  };
}

function byShape<T>(make: (shape: BoardShape) => T): ByShape<T> {
  const row = (rows: BoardShape["rows"]) => ({
    11: make(boardShape(rows, 11)),
    10: make(boardShape(rows, 10)),
    9: make(boardShape(rows, 9)),
    8: make(boardShape(rows, 8)),
  });
  return { 6: row(6), 4: row(4) };
}

function isUsedOf(shape: BoardShape, value: unknown): value is boolean[] {
  return (
    Array.isArray(value) &&
    value.length === shape.rows * shape.columns &&
    value.every((cell: unknown) => typeof cell === "boolean")
  );
}

/**
 * The layout of each board shape, each edited on its own (ADR-0007 §4).
 * A shape that is missing or not valid gets its default layout.
 */
export function layoutsByShape(): Item<LayoutsByShape> {
  return {
    defaultValue: byShape((shape) => defaultLayout(shape).used),
    read: (saved) => {
      if (!isRecord(saved)) {
        return undefined;
      }
      return byShape((shape) => {
        const columns = fieldOf(saved, String(shape.rows));
        const used = fieldOf(columns, String(shape.columns));
        return isUsedOf(shape, used) ? used : defaultLayout(shape).used;
      });
    },
    form: { kind: "layouts" },
  };
}

/** The layouts with one shape's layout put in place of the one before. */
export function withLayout(
  layouts: LayoutsByShape,
  shape: BoardShape,
  used: readonly boolean[],
): LayoutsByShape {
  return byShape((other) =>
    other.rows === shape.rows && other.columns === shape.columns
      ? used
      : layouts[other.rows][other.columns],
  );
}

/** The layout of one board shape. */
export function layoutFor(layouts: LayoutsByShape, shape: BoardShape): Layout {
  return { shape, used: layouts[shape.rows][shape.columns] };
}

/**
 * Items under names. The same build gives the defaults and reads each item
 * on its own: an item that is missing or not valid gets its default, and
 * names not in the group are dropped (ADR-0003 §4).
 */
export function group<T>(build: (field: Field) => T): Item<Readonly<T>> {
  const fields: NamedItem[] = [];
  const defaultValue = build((name, item) => {
    fields.push({ name, item });
    return item.defaultValue;
  });
  return {
    defaultValue,
    form: { kind: "group", fields },
    read: (saved) => {
      if (!isRecord(saved)) {
        return undefined;
      }
      return build(
        (name, item) => item.read(fieldOf(saved, name)) ?? item.defaultValue,
      );
    },
  };
}
