import { expect, test } from "vitest";
import { poemId, type PoemId } from "./poem-id";
import { POEMS } from "./poems";
import { excludingDeadCards, questionTargets } from "./question-targets";

const ALL = POEMS.map((poem) => poem.id);

function ascending(ids: readonly PoemId[]): PoemId[] {
  return ids.toSorted((a, b) => a - b);
}

test("仕様 03 §2 限定 ON で選んでいれば、選んだ歌が対象", () => {
  const selected = [poemId(87), poemId(18), poemId(87)];
  expect(ascending(questionTargets(true, selected))).toEqual([18, 87]);
});

test("仕様 03 §2 限定 ON でも1首も選んでいなければ、100首が対象", () => {
  expect(ascending(questionTargets(true, []))).toEqual(ascending(ALL));
});

test("仕様 03 §2 限定 OFF なら、選んでいても100首が対象", () => {
  expect(ascending(questionTargets(false, [poemId(87)]))).toEqual(
    ascending(ALL),
  );
});

test("仕様 03 §7 §8 空札を除外する ON なら、場にある札だけ。OFF なら対象すべて", () => {
  const targets = [poemId(87), poemId(18), poemId(57)];
  const onBoard = [poemId(18), poemId(22)];
  expect(excludingDeadCards(targets, onBoard, true)).toEqual([18]);
  expect(excludingDeadCards(targets, onBoard, false)).toEqual([87, 18, 57]);
});
