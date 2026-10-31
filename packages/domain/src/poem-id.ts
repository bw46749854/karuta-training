declare const poemIdBrand: unique symbol;

/** A poem number, an integer from 1 to 100 (spec 01 §2). */
export type PoemId = number & { readonly [poemIdBrand]: true };

function isPoemId(value: number): value is PoemId {
  return Number.isInteger(value) && value >= 1 && value <= 100;
}

/**
 * For values known to be poem numbers, such as the master data. Any other
 * value is a bug, so it throws.
 */
export function poemId(value: number): PoemId {
  if (isPoemId(value)) {
    return value;
  }
  throw new RangeError(
    `Not a poem number (an integer from 1 to 100): ${String(value)}`,
  );
}
