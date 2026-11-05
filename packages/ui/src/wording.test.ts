import { expect, test } from "vitest";
import { WORDING } from "./wording";

// Every string in the table, with each function called on sample values.
function texts(table: unknown): string[] {
  if (typeof table === "string") {
    return [table];
  }
  if (typeof table === "function") {
    return [String(Reflect.apply(table, undefined, [1, 2, 3]))];
  }
  if (typeof table === "object" && table !== null) {
    return Object.values(table).flatMap(texts);
  }
  return [];
}

test("ADR-0005 §5 文言に、文字化けの印（置き換え文字）がない", () => {
  const all = texts(WORDING);
  expect(all.length).toBeGreaterThan(0);
  for (const text of all) {
    expect(text).not.toContain("�");
    expect(text.length).toBeGreaterThan(0);
  }
});
