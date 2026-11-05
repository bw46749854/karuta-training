import { PREFIX_GROUPS, type PlacementQuestion } from "@karuta/domain";
import type { Effect, PracticeMode, Step } from "../practice/contract";
import type { AfterAnswer } from "../settings/definition";
import type {
  Phase,
  PlacementCommand,
  PlacementInput,
  PlacementState,
  PlacementTimer,
  PlacementView,
} from "./types";
import { placementView } from "./view";

// 配置暗記 (spec 07), as a practice mode (ADR-0004).

export type {
  PlacementCommand,
  PlacementInput,
  PlacementState,
  PlacementTimer,
  PlacementView,
} from "./types";

type PlacementStep = Step<PlacementState, PlacementTimer>;

const NEXT_KEY = "next";

function stay(state: PlacementState): PlacementStep {
  return { state, effects: [] };
}

/** Every card face down, or every card face up. */
function allCards(state: PlacementState, down: boolean): readonly boolean[] {
  return state.input.board.cells.map((poem) => poem !== null && down);
}

/** The cells where these poems are on the board. */
function cellsOf(
  state: PlacementState,
  poems: ReadonlySet<number>,
): readonly number[] {
  return state.input.board.cells.flatMap((poem, cell) =>
    poem !== null && poems.has(poem) ? [cell] : [],
  );
}

/** Spec 07 §5.3: the cells of the question's cards on the board. */
function rightCells(
  state: PlacementState,
  question: PlacementQuestion,
): readonly number[] {
  const poems =
    question.kind === "group" ? question.group.poems : [question.poem];
  return cellsOf(state, new Set(poems));
}

/** Turns these cells over: all face up when all are down, else all down. */
function turned(
  state: PlacementState,
  cells: readonly number[],
): PlacementState {
  if (cells.length === 0) {
    return state;
  }
  const allDown = cells.every((cell) => state.faceDown[cell] === true);
  const chosen = new Set(cells);
  const faceDown = state.faceDown.map((down, cell) =>
    chosen.has(cell) ? !allDown : down,
  );
  return { ...state, faceDown };
}

type FlipCommand = Extract<
  PlacementCommand,
  { kind: "flip-cell" | "flip-poem" | "flip-group" }
>;

function isFlip(command: PlacementCommand): command is FlipCommand {
  return (
    command.kind === "flip-cell" ||
    command.kind === "flip-poem" ||
    command.kind === "flip-group"
  );
}

/** Spec 07 §4: turning cards over, while memorizing or checking. */
function flip(state: PlacementState, command: FlipCommand): PlacementState {
  switch (command.kind) {
    case "flip-cell":
      return (state.input.board.cells[command.cell] ?? null) === null
        ? state
        : turned(state, [command.cell]);
    case "flip-poem":
      return turned(state, cellsOf(state, new Set([command.poem])));
    case "flip-group": {
      const group = PREFIX_GROUPS.find(
        (candidate) => candidate.name === command.name,
      );
      return group === undefined
        ? state
        : turned(state, cellsOf(state, new Set(group.poems)));
    }
  }
}

/** Spec 07 §5.6: whether a setting applies after a right or wrong answer. */
function applies(setting: AfterAnswer, correct: boolean): boolean {
  switch (setting) {
    case "always":
      return true;
    case "never":
      return false;
    case "when-correct":
      return correct;
    case "when-wrong":
      return !correct;
  }
}

function backToMemorizing(
  state: PlacementState,
  notice: "all-asked" | null,
): PlacementStep {
  return {
    state: {
      ...state,
      faceDown: allCards(state, false),
      phase: { kind: "memorizing", notice },
    },
    effects: [{ kind: "cancel", key: NEXT_KEY }],
  };
}

/** Spec 07 §5.7 to §5.9: the next question, with every card face down. */
function advance(
  state: PlacementState,
  questions: readonly PlacementQuestion[],
  index: number,
): PlacementStep {
  const question = questions[index];
  if (question === undefined) {
    return backToMemorizing(state, "all-asked");
  }
  return {
    state: {
      ...state,
      faceDown: allCards(state, true),
      phase: { kind: "asking", questions, index, question, selected: [] },
    },
    effects: [{ kind: "cancel", key: NEXT_KEY }],
  };
}

function answer(
  state: PlacementState,
  phase: Extract<Phase, { kind: "asking" }>,
): PlacementStep {
  const right = rightCells(state, phase.question);
  const chosen = new Set(phase.selected);
  const correct =
    chosen.size === right.length && right.every((cell) => chosen.has(cell));
  const { input } = state;
  const shown = new Set(applies(input.showAnswer, correct) ? right : []);
  const effects: Effect<PlacementTimer>[] = input.autoNext
    ? [
        {
          kind: "schedule",
          key: NEXT_KEY,
          afterMs: input.waitMs,
          event: { kind: "auto-next", question: phase.index },
        },
      ]
    : [];
  return {
    state: {
      ...state,
      faceDown: state.faceDown.map((down, cell) => down && !shown.has(cell)),
      phase: {
        ...phase,
        kind: "judged",
        correct,
        checking: applies(input.allowCheck, correct),
      },
      results: [...state.results, correct ? "correct" : "wrong"],
    },
    effects,
  };
}

function onMemorizing(
  state: PlacementState,
  command: PlacementCommand,
): PlacementStep {
  switch (command.kind) {
    case "invert":
      return stay({
        ...state,
        faceDown: state.input.board.cells.map(
          (poem, cell) => poem !== null && state.faceDown[cell] !== true,
        ),
      });
    case "start":
      return advance({ ...state, results: [] }, command.questions, 0);
    case "flip-cell":
    case "flip-poem":
    case "flip-group":
      return stay(flip(state, command));
    case "answer":
    case "skip":
    case "next":
    case "end":
      return stay(state);
  }
}

function select(
  state: PlacementState,
  phase: Extract<Phase, { kind: "asking" }>,
  cell: number,
): PlacementStep {
  if ((state.input.board.cells[cell] ?? null) === null) {
    return stay(state);
  }
  const selected = phase.selected.includes(cell)
    ? phase.selected.filter((other) => other !== cell)
    : [...phase.selected, cell];
  return stay({ ...state, phase: { ...phase, selected } });
}

function onAsking(
  state: PlacementState,
  phase: Extract<Phase, { kind: "asking" }>,
  command: PlacementCommand,
): PlacementStep {
  switch (command.kind) {
    case "flip-cell":
      return select(state, phase, command.cell);
    case "answer":
      return answer(state, phase);
    case "skip":
      return advance(
        { ...state, results: [...state.results, "skipped"] },
        phase.questions,
        phase.index + 1,
      );
    case "end":
      return backToMemorizing(state, null);
    case "flip-poem":
    case "flip-group":
    case "invert":
    case "start":
    case "next":
      return stay(state);
  }
}

function onJudged(
  state: PlacementState,
  phase: Extract<Phase, { kind: "judged" }>,
  command: PlacementCommand,
): PlacementStep {
  if (isFlip(command)) {
    // Spec 07 §5.6: turning cards over only when checking is allowed.
    return stay(phase.checking ? flip(state, command) : state);
  }
  switch (command.kind) {
    case "next":
      return advance(state, phase.questions, phase.index + 1);
    case "end":
      return backToMemorizing(state, null);
    case "invert":
    case "start":
    case "answer":
    case "skip":
      return stay(state);
  }
}

function onCommand(
  state: PlacementState,
  command: PlacementCommand,
): PlacementStep {
  const { phase } = state;
  switch (phase.kind) {
    case "memorizing":
      return onMemorizing(state, command);
    case "asking":
      return onAsking(state, phase, command);
    case "judged":
      return onJudged(state, phase, command);
  }
}

export const PLACEMENT: PracticeMode<
  PlacementInput,
  PlacementState,
  PlacementCommand,
  PlacementTimer,
  PlacementView
> = {
  start: (input) =>
    stay({
      input,
      faceDown: input.board.cells.map(() => false),
      phase: { kind: "memorizing", notice: null },
      results: [],
    }),
  update: (state, message) => {
    if (message.kind === "command") {
      return onCommand(state, message.command);
    }
    const { phase } = state;
    return phase.kind === "judged" && message.event.question === phase.index
      ? advance(state, phase.questions, phase.index + 1)
      : stay(state);
  },
  view: placementView,
};
