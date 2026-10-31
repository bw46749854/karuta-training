import { expect, test } from "vitest";
import { POEMS, type Poem } from "./poems";
import vector from "./vectors/static-kimariji-distribution.json" with { type: "json" };

// Spec 01 §3: the only characters that kimariji are written with.
const KIMARIJI_CHARACTERS = new Set(
  "あいうえおかがきぎくぐけげこごさざしじすせぜそたちつとなにぬのはひびふほぼまみむめもやゆよらりるれろわを",
);

// Spec 01 §3: one character is one code point.
function characters(text: string): string[] {
  return Array.from(text);
}

function lengthOf(text: string): number {
  return characters(text).length;
}

function label(poem: Poem): string {
  return `${poem.staticKimariji}（${String(poem.id)}番）`;
}

function othersStartingWith(poem: Poem, start: string): Poem[] {
  return POEMS.filter(
    (other) => other !== poem && other.staticKimariji.startsWith(start),
  );
}

test("仕様 01 §8.3 歌番号は 1〜100 がちょうど1回ずつ現れる", () => {
  const ids = POEMS.map((poem) => poem.id).toSorted((a, b) => a - b);
  expect(ids).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
});

test("仕様 01 §8.3 静的決まり字は §3 の文字だけで書かれている", () => {
  const invalid = POEMS.filter((poem) =>
    characters(poem.staticKimariji).some((c) => !KIMARIJI_CHARACTERS.has(c)),
  );
  expect(invalid.map(label)).toEqual([]);
});

test("仕様 01 §8.3 一意性：どの歌の静的決まり字も、ほかの歌の静的決まり字の先頭部分になっていない", () => {
  const violations = POEMS.flatMap((poem) =>
    othersStartingWith(poem, poem.staticKimariji).map(
      (other) => `${label(poem)} → ${label(other)}`,
    ),
  );
  expect(violations).toEqual([]);
});

test("仕様 01 §8.3 最短性：2文字以上の静的決まり字は、最後の1文字を除くと、ほかのある歌の静的決まり字の先頭部分になる", () => {
  const violations = POEMS.filter((poem) => {
    const head = characters(poem.staticKimariji).slice(0, -1).join("");
    return head !== "" && othersStartingWith(poem, head).length === 0;
  });
  expect(violations.map(label)).toEqual([]);
});

test("仕様 01 §8.3 静的決まり字の分布が §4.2 のテストベクタと一致する", () => {
  const byLength = Map.groupBy(POEMS, (poem) => lengthOf(poem.staticKimariji));
  const distribution = [...byLength]
    .map(([length, poems]) => ({ length, poems: poems.length }))
    .toSorted((a, b) => a.length - b.length);
  expect(distribution).toEqual(vector.distribution);
});

test("仕様 01 §4.2 1字決まりは「むすめふさほせ」の7首", () => {
  const oneCharacter = POEMS.filter(
    (poem) => lengthOf(poem.staticKimariji) === 1,
  ).map((poem) => poem.staticKimariji);
  expect(oneCharacter.toSorted()).toEqual(
    vector.oneCharacterKimariji.toSorted(),
  );
});
