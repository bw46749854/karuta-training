import { BOARD_SHAPES, boardShape, defaultLayout, POEMS } from "@karuta/domain";
import { expect, test } from "vitest";
import {
  fieldOf,
  flag,
  group,
  layoutFor,
  layoutsByShape,
  poemIds,
} from "./items";

const [first, second] = POEMS.map((poem) => poem.id);

test("ADR-0003 §4 名前の項目を取り出す。ない項目、元から持っている性質は取り出さない", () => {
  expect(fieldOf({ a: 1 }, "a")).toBe(1);
  expect(fieldOf({ a: 1 }, "b")).toBeUndefined();
  expect(fieldOf({ a: 1 }, "toString")).toBeUndefined();
  expect(fieldOf("text", "length")).toBeUndefined();
  expect(fieldOf(null, "a")).toBeUndefined();
});

test("ADR-0003 §4 ON/OFF の項目は、真偽値だけを読む", () => {
  const item = flag(true);
  expect(item.defaultValue).toBe(true);
  expect(item.read(false)).toBe(false);
  expect(item.read(true)).toBe(true);
  for (const invalid of ["true", 1, null, undefined]) {
    expect(item.read(invalid)).toBeUndefined();
  }
});

test("ADR-0003 §4 歌の集まりの項目は、重なりのない歌番号の並びだけを読む", () => {
  const item = poemIds([]);
  expect(item.defaultValue).toEqual([]);
  expect(item.read([87, 18])).toEqual([87, 18]);
  expect(item.read([])).toEqual([]);
  for (const invalid of [[0], [101], [1.5], ["1"], [87, 87], "87", null]) {
    expect(item.read(invalid)).toBeUndefined();
  }
});

test("ADR-0007 §4 札の配置の初期値は、どの形も仕様 03 §6.1 の初期の配置", () => {
  const { defaultValue } = layoutsByShape();
  for (const shape of BOARD_SHAPES) {
    expect(layoutFor(defaultValue, shape)).toEqual(defaultLayout(shape));
  }
});

test("ADR-0003 §4 札の配置は形ごとに読み、ない形や正しくない形だけを初期値で補う", () => {
  const item = layoutsByShape();
  const all4x8 = Array.from({ length: 32 }, () => true);
  const read = item.read({ 4: { 8: all4x8, 9: [true] }, 6: { 11: "x" } });
  expect(read).toBeDefined();
  if (read === undefined) {
    return;
  }
  expect(layoutFor(read, boardShape(4, 8)).used).toEqual(all4x8);
  for (const [rows, columns] of [
    [4, 9],
    [6, 11],
    [6, 9],
  ] as const) {
    const shape = boardShape(rows, columns);
    expect(layoutFor(read, shape)).toEqual(defaultLayout(shape));
  }
  const notBoolean = item.read({ 4: { 8: all4x8.map(() => 1) } });
  expect(notBoolean?.[4][8]).toEqual(defaultLayout(boardShape(4, 8)).used);
  expect(item.read("x")).toBeUndefined();
  expect(item.read(null)).toBeUndefined();
});

test("ADR-0003 §4 まとまりは、項目ごとに読み、ない項目や正しくない項目だけを初期値で補う。知らない項目は捨てる", () => {
  const item = group((field) => ({
    on: field("on", flag(true)),
    poems: field("poems", poemIds([])),
  }));
  expect(item.defaultValue).toEqual({ on: true, poems: [] });
  expect(item.read({ on: false, poems: [first, second] })).toEqual({
    on: false,
    poems: [first, second],
  });
  expect(item.read({ on: "no", extra: 1 })).toEqual({ on: true, poems: [] });
  for (const invalid of [null, 3, "x", [true]]) {
    expect(item.read(invalid)).toBeUndefined();
  }
});
