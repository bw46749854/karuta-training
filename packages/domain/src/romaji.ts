const VOWELS = "aiueo";

// Spec 02 §4.1: one row per consonant, its kana in the order a, i, u, e, o.
const ROWS: readonly (readonly [string, string])[] = [
  ["", "あいうえお"],
  ["k", "かきくけこ"],
  ["g", "がぎぐげご"],
  ["s", "さしすせそ"],
  ["z", "ざじずぜぞ"],
  ["t", "たちつてと"],
  ["d", "だぢづでど"],
  ["n", "なにぬねの"],
  ["h", "はひふへほ"],
  ["b", "ばびぶべぼ"],
  ["p", "ぱぴぷぺぽ"],
  ["m", "まみむめも"],
  ["y", "やいゆえよ"],
  ["r", "らりるれろ"],
  ["w", "わゐうゑを"],
];

// Spec 02 §4.1: the other spellings in the table.
const OTHER_SPELLINGS: readonly (readonly [string, string])[] = [
  ["shi", "し"],
  ["ji", "じ"],
  ["chi", "ち"],
  ["tsu", "つ"],
  ["fu", "ふ"],
];

const KANA_BY_SPELLING: ReadonlyMap<string, string> = new Map([
  ...ROWS.flatMap(([consonant, kana]) =>
    Array.from(kana, (k, index): [string, string] => [
      consonant + VOWELS.charAt(index),
      k,
    ]),
  ),
  ...OTHER_SPELLINGS,
]);

/**
 * Romaji to hiragana by the table in spec 02 §4.1, or undefined when the
 * romaji is not made of spellings in the table. Case does not matter.
 */
export function romajiToKana(romaji: string): string | undefined {
  // Each spelling ends with its only vowel. So romaji that does not end with
  // a vowel cannot be converted, and cutting after each vowel gives the
  // spellings.
  const lower = romaji.toLowerCase();
  if (!/[aiueo]$/.test(lower)) {
    return undefined;
  }
  const kana = Array.from(lower.matchAll(/[^aiueo]*[aiueo]/g), ([spelling]) =>
    KANA_BY_SPELLING.get(spelling),
  );
  return kana.includes(undefined) ? undefined : kana.join("");
}
