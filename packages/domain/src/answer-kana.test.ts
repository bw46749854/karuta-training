import fc from "fast-check";
import { expect, test } from "vitest";
import { answerKana } from "./answer-kana";
import { POEMS } from "./poems";
import vectors from "./vectors/answer-kana.json" with { type: "json" };
import table from "./vectors/romaji-table.json" with { type: "json" };

const SPELLINGS: Readonly<Record<string, string>> = table.spellings;

// Spec 02 §4.1: every way to spell the kana with the table.
function spellingsOf(kana: string): string[] {
  return Array.from(kana).reduce<string[]>(
    (heads, character) =>
      heads.flatMap((head) =>
        Object.entries(SPELLINGS)
          .filter(([, k]) => k === character)
          .map(([spelling]) => head + spelling),
      ),
    [""],
  );
}

function startsOf(text: string): string[] {
  const characters = Array.from(text);
  return characters.map((_, index) => characters.slice(0, index + 1).join(""));
}

const hiragana = fc
  .integer({ min: 0x3041, max: 0x3096 })
  .map((codePoint) => String.fromCodePoint(codePoint));

test.each(vectors)(
  "仕様 02 §4 §5 「$answer」（ローマ字入力 $romajiAllowed）",
  ({ answer, romajiAllowed, expected }) => {
    expect(answerKana(answer, romajiAllowed)).toEqual(expected);
  },
);

test("仕様 02 §8.2 R1 静的決まり字とその先頭部分は、表のどのつづりで入力しても、そのかなになる", () => {
  const kana = new Set(POEMS.flatMap((poem) => startsOf(poem.staticKimariji)));
  const failures = [...kana].flatMap((text) => {
    const spellings = spellingsOf(text);
    if (spellings.length === 0) {
      return [`${text}: つづりがない`];
    }
    return spellings
      .filter(
        (spelling) =>
          JSON.stringify(answerKana(spelling, true)) !==
          JSON.stringify({ kind: "kana", kana: text }),
      )
      .map((spelling) => `${spelling} → ${text}`);
  });
  expect(failures).toEqual([]);
});

test("仕様 02 §8.2 R2 ローマ字の大文字・小文字は、答えのかなを変えない", () => {
  const cases = fc.record({
    poem: fc.constantFrom(...POEMS),
    pick: fc.nat(),
    upper: fc.array(fc.boolean(), { minLength: 18, maxLength: 18 }),
  });
  fc.assert(
    fc.property(cases, ({ poem, pick, upper }) => {
      const spellings = spellingsOf(poem.staticKimariji);
      const spelling = spellings[pick % spellings.length] ?? "";
      const answer = Array.from(spelling, (c, index) =>
        upper[index] === true ? c.toUpperCase() : c,
      ).join("");
      expect(answerKana(answer, true)).toEqual({
        kind: "kana",
        kana: poem.staticKimariji,
      });
    }),
  );
});

test("仕様 02 §8.2 R3 ひらがなだけの答えは、そのまま答えのかなになる", () => {
  const answers = fc.string({ unit: hiragana, minLength: 1 });
  fc.assert(
    fc.property(answers, fc.boolean(), (answer, romajiAllowed) => {
      expect(answerKana(answer, romajiAllowed)).toEqual({
        kind: "kana",
        kana: answer,
      });
    }),
  );
});

test("仕様 02 §8.2 R4 ローマ字入力が OFF なら、半角英字を含む答えは、かなに直せない", () => {
  const letter = fc.constantFrom(
    ...Array.from("abcdefghijklmnopqrstuvwxyzABCXYZ"),
  );
  const answers = fc
    .tuple(
      fc.string({ unit: "grapheme" }),
      letter,
      fc.string({ unit: "grapheme" }),
    )
    .map(([before, l, after]) => before + l + after);
  fc.assert(
    fc.property(answers, (answer) => {
      expect(answerKana(answer, false).kind).toBe("unconvertible");
    }),
  );
});
