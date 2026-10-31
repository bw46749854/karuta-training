import { expect, test } from "vitest";
import type { PoemId } from "./poem-id";
import { POEMS, type Poem } from "./poems";
import { PREFIX_GROUPS } from "./prefix-groups";

// Spec 01 §3: one character is one code point.
function characters(text: string): string[] {
  return Array.from(text);
}

function ascending(ids: readonly PoemId[]): PoemId[] {
  return ids.toSorted((a, b) => a - b);
}

// Spec 01 §7: a start of a static kimariji, short of its last character, that
// two or more poems share makes a group of those poems. When several starts
// give the same poems, the shortest one is the group's name.
function groupsByDefinition(poems: readonly Poem[]): Record<string, PoemId[]> {
  const groupByPoems = new Map<string, { name: string; poems: PoemId[] }>();
  for (const poem of poems) {
    const start = characters(poem.staticKimariji);
    // Shortest start first, so the first name found for a set of poems is
    // the shortest one.
    for (let length = 1; length < start.length; length += 1) {
      const name = start.slice(0, length).join("");
      const members = ascending(
        poems.filter((p) => p.staticKimariji.startsWith(name)).map((p) => p.id),
      );
      const key = members.join(",");
      if (members.length >= 2 && !groupByPoems.has(key)) {
        groupByPoems.set(key, { name, poems: members });
      }
    }
  }
  return Object.fromEntries(
    [...groupByPoems.values()].map((group) => [group.name, group.poems]),
  );
}

test("仕様 01 §8.3 決まり字グループは、静的決まり字に対して §7 の定義どおりの歌の集まりになっている", () => {
  const groups = Object.fromEntries(
    PREFIX_GROUPS.map((group) => [group.name, ascending(group.poems)]),
  );
  expect(groups).toEqual(groupsByDefinition(POEMS));
});

test("仕様 01 §7 決まり字グループは46グループ", () => {
  expect(PREFIX_GROUPS).toHaveLength(46);
});

test("仕様 01 §8.3 決まり字グループの名前は重複していない", () => {
  const names = PREFIX_GROUPS.map((group) => group.name);
  const repeated = names.filter((name, index) => names.indexOf(name) !== index);
  expect(repeated).toEqual([]);
});
