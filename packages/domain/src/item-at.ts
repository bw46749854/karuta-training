/**
 * The item at the index. The lists here never hold undefined, so a missing
 * item means a bad index, which is a bug.
 */
export function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(
      `No item at ${String(index)} of ${String(items.length)}`,
    );
  }
  return item;
}
