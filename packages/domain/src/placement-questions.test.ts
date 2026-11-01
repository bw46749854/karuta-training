import fc from "fast-check";
import { expect, test } from "vitest";
import {
  placementQuestions,
  type PlacementMode,
  type PlacementQuestion,
} from "./placement-questions";
import { poemId, type PoemId } from "./poem-id";
import { POEMS } from "./poems";
import { PREFIX_GROUPS } from "./prefix-groups";
import { allOutcomes, firstChoice, randomFrom } from "./test-support/random";
import vectors from "./vectors/placement-questions.json" with { type: "json" };

const ALL = POEMS.map((poem) => poem.id);
const MODES: PlacementMode[] = ["group", "individual", "mixed"];

interface Summary {
  readonly groups: readonly string[];
  readonly poems: readonly number[];
}

function modeOf(value: string): PlacementMode {
  const mode = MODES.find((m) => m === value);
  if (mode === undefined) {
    throw new Error(`Unknown mode in a test vector: ${value}`);
  }
  return mode;
}

function labelOf(question: PlacementQuestion): string {
  return question.kind === "group"
    ? question.group.name
    : String(question.poem);
}

function summaryOf(questions: readonly PlacementQuestion[]): Summary {
  return {
    groups: questions
      .flatMap((q) => (q.kind === "group" ? [q.group.name] : []))
      .toSorted(),
    poems: questions
      .flatMap((q) => (q.kind === "individual" ? [q.poem] : []))
      .toSorted((a, b) => a - b),
  };
}

// Spec 03 §7, written out again as the test's own reading of the spec.
function bySpec({
  targets,
  onBoard,
  mode,
  excludeDead,
}: {
  readonly targets: readonly PoemId[];
  readonly onBoard: readonly PoemId[];
  readonly mode: PlacementMode;
  readonly excludeDead: boolean;
}): Summary {
  const kept = (poems: readonly PoemId[]) =>
    poems.some((p) => targets.includes(p)) &&
    (!excludeDead || poems.some((p) => onBoard.includes(p)));
  const groups = PREFIX_GROUPS.filter((g) => kept(g.poems)).map((g) => g.name);
  const poems = targets.filter((p) => !excludeDead || onBoard.includes(p));
  return {
    groups: mode === "individual" ? [] : groups.toSorted(),
    poems: mode === "group" ? [] : poems.toSorted((a, b) => a - b),
  };
}

test.each(vectors)(
  "仕様 03 §7 $description",
  ({ targets, onBoard, mode, excludeDead, expected }) => {
    const questions = placementQuestions(
      {
        targets: targets.map(poemId),
        onBoard: onBoard.map(poemId),
        mode: modeOf(mode),
        excludeDead,
      },
      firstChoice,
    );
    expect(summaryOf(questions)).toEqual({
      groups: expected.groups.toSorted(),
      poems: expected.poems.toSorted((a, b) => a - b),
    });
  },
);

test("仕様 03 §9.2 P1 配置暗記の問は、§7 の集まりとちょうど一致し、どの問も1回ずつ", () => {
  const cases = fc.record({
    targets: fc.shuffledSubarray(ALL, { minLength: 1 }),
    onBoard: fc.subarray(ALL),
    mode: fc.constantFrom(...MODES),
    excludeDead: fc.boolean(),
    values: fc.array(fc.nat()),
  });
  fc.assert(
    fc.property(cases, ({ targets, onBoard, mode, excludeDead, values }) => {
      const settings = { targets, onBoard, mode, excludeDead };
      const questions = placementQuestions(settings, randomFrom(values));
      const labels = questions.map(labelOf);
      expect(new Set(labels).size).toBe(labels.length);
      expect(summaryOf(questions)).toEqual(bySpec(settings));
    }),
  );
});

test("仕様 03 §7 混合では、グループの問と個別の問が、どの順にも同じ確からしさで混ざる", () => {
  const outcomes = allOutcomes((random) =>
    placementQuestions(
      {
        targets: [poemId(39)],
        onBoard: [poemId(39)],
        mode: "mixed",
        excludeDead: false,
      },
      random,
    )
      .map(labelOf)
      .join(","),
  );
  expect(outcomes).toHaveLength(6);
  expect(new Set(outcomes).size).toBe(6);
});
