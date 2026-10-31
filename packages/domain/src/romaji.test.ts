import fc from "fast-check";
import { expect, test } from "vitest";
import { romajiToKana } from "./romaji";
import table from "./vectors/romaji-table.json" with { type: "json" };

const SPELLINGS: Readonly<Record<string, string>> = table.spellings;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";

// Spec 02 §4.1, said another way: a string converts when it can be cut into
// spellings of the table, and the kana are those of the spellings in order.
function bySpellings(text: string): string | undefined {
  if (text === "") {
    return "";
  }
  for (const [spelling, kana] of Object.entries(SPELLINGS)) {
    const rest = text.startsWith(spelling)
      ? bySpellings(text.slice(spelling.length))
      : undefined;
    if (rest !== undefined) {
      return kana + rest;
    }
  }
  return undefined;
}

function upTo3Letters(): string[] {
  const one = Array.from(LETTERS);
  const two = one.flatMap((a) => one.map((b) => a + b));
  const three = two.flatMap((ab) => one.map((c) => ab + c));
  return [...one, ...two, ...three];
}

test.each(Object.entries(SPELLINGS))(
  "仕様 02 §4.1 「%s」は「%s」",
  (spelling, kana) => {
    expect(romajiToKana(spelling)).toBe(kana);
  },
);

test.each(table.unconvertible)("仕様 02 §4.1 「%s」は変換できない", (text) => {
  expect(romajiToKana(text)).toBeUndefined();
});

test("仕様 02 §4.1 英小文字3文字までのどの並びも、表のつづりに分けられるときだけ、つづりのかなになる", () => {
  const differing = upTo3Letters().filter(
    (text) => romajiToKana(text) !== bySpellings(text),
  );
  expect(differing).toEqual([]);
});

test("仕様 02 §4.1 長い並びも、表のつづりに分けられるときだけ、つづりのかなになる", () => {
  const text = fc.string({
    unit: fc.constantFrom(...Array.from("aiueokgsztdnhbpmyrwcfj")),
    minLength: 4,
    maxLength: 16,
  });
  fc.assert(
    fc.property(text, (romaji) => {
      expect(romajiToKana(romaji)).toBe(bySpellings(romaji));
    }),
  );
});
