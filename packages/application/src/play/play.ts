import { kimariji, type PoemId } from "@karuta/domain";
import type { Effect, Message, PracticeMode, Step } from "../practice/contract";
import { candidatesAfter, staticKimariji } from "../practice/kimariji-list";
import type {
  Phase,
  PlayCommand,
  PlayInput,
  PlayJudgement,
  PlayState,
  PlayTimer,
  PlayView,
} from "./types";
import { playView } from "./view";

// 実践練習 (spec 08), as a practice mode (ADR-0004).

export type {
  PlayCommand,
  PlayInput,
  PlayJudgement,
  PlayTimer,
  PlayView,
} from "./types";

type PlayStep = Step<PlayState, PlayTimer>;
type Reading = Extract<Phase, { kind: "reading" }>;

const JUDGE_KEY = "judge";
const NEXT_KEY = "next";
// A static kimariji is at most 6 letters (大山札, spec 01 §2).
const MOST_LETTERS = 6;
const letterKey = (shown: number) => `letter-${String(shown)}`;

function stay(state: PlayState): PlayStep {
  return { state, effects: [] };
}

/** Every timer a question can have (ADR-0004 §3). */
function cancelAll(): Effect<PlayTimer>[] {
  const keys = [JUDGE_KEY, NEXT_KEY];
  for (let shown = 2; shown <= MOST_LETTERS; shown += 1) {
    keys.push(letterKey(shown));
  }
  return keys.map((key) => ({ kind: "cancel", key }));
}

/**
 * Spec 08 §4.1, §4.3: starts reading the question at the index. Each
 * letter is timed from the start, so delays do not add up; the judgement
 * comes one interval after the last letter. After the last question, the
 * session is over.
 */
function readQuestion(state: PlayState, index: number, at: number): PlayStep {
  const poem = state.input.order[index];
  if (poem === undefined) {
    return {
      state: { ...state, index, phase: { kind: "finished" } },
      effects: cancelAll(),
    };
  }
  const interval = state.input.letterIntervalMs;
  const length = Array.from(staticKimariji(poem)).length;
  const letters = Array.from(
    { length: length - 1 },
    (_, before): Effect<PlayTimer> => ({
      kind: "schedule",
      key: letterKey(before + 2),
      afterMs: (before + 1) * interval,
      event: { kind: "letter", question: index, shown: before + 2 },
    }),
  );
  return {
    state: {
      ...state,
      index,
      phase: { kind: "reading", poem, startedAt: at, shown: 1, taken: null },
    },
    effects: [
      ...cancelAll(),
      ...letters,
      {
        kind: "schedule",
        key: JUDGE_KEY,
        afterMs: length * interval,
        event: { kind: "judge", question: index },
      },
    ],
  };
}

/** The cell where the poem's card still is, if it is on the board. */
function cellOf(state: PlayState, poem: PoemId): number | undefined {
  const removed = new Set(state.removed);
  const cell = state.input.board.cells.indexOf(poem);
  return cell < 0 || removed.has(cell) ? undefined : cell;
}

/** Spec 08 §5: the judgement of the question being read. */
function judge(state: PlayState, phase: Reading): PlayJudgement {
  const read = state.input.order.slice(0, state.index);
  const deciding =
    Array.from(kimariji(phase.poem, candidatesAfter(true, read))).length - 1;
  const interval = state.input.letterIntervalMs;
  const opens = phase.startedAt + deciding * interval;
  const closes = opens + interval;
  const cell = cellOf(state, phase.poem);
  const { taken } = phase;
  if (taken === null) {
    return cell === undefined ? { kind: "dead" } : { kind: "missed" };
  }
  if (taken.cell !== cell) {
    return { kind: "wrong-card" };
  }
  if (taken.at < opens) {
    return { kind: "early", seconds: (opens - taken.at) / 1000 };
  }
  if (taken.at > closes) {
    return { kind: "late", seconds: (taken.at - closes) / 1000 };
  }
  return { kind: "correct" };
}

/** Spec 08 §4.4, §6: the card read leaves the board, whatever the result. */
function finishQuestion(
  state: PlayState,
  poem: PoemId,
  judgement: PlayJudgement | null,
): PlayState {
  const cell = cellOf(state, poem);
  const correct = judgement?.kind === "correct" || judgement?.kind === "dead";
  return {
    ...state,
    removed: cell === undefined ? state.removed : [...state.removed, cell],
    results: [
      ...state.results,
      {
        poem,
        outcome: judgement === null ? "skipped" : correct ? "correct" : "wrong",
        judgement,
      },
    ],
  };
}

function onJudge(state: PlayState, phase: Reading): PlayStep {
  const judgement = judge(state, phase);
  const finished = finishQuestion(state, phase.poem, judgement);
  const { autoNext, waitMs } = state.input;
  return {
    state: {
      ...finished,
      phase: {
        kind: "judged",
        poem: phase.poem,
        judgement,
        taken: phase.taken?.cell ?? null,
      },
    },
    effects: autoNext
      ? [
          {
            kind: "schedule",
            key: NEXT_KEY,
            afterMs: waitMs,
            event: { kind: "auto-next", question: state.index },
          },
        ]
      : [],
  };
}

/** Spec 08 §4.2: only the first take counts, and only of a card there. */
function take(
  state: PlayState,
  phase: Reading,
  taken: { readonly cell: number; readonly at: number },
): PlayStep {
  const poem = state.input.board.cells[taken.cell] ?? null;
  const usable =
    phase.taken === null &&
    poem !== null &&
    !state.removed.includes(taken.cell);
  return stay(usable ? { ...state, phase: { ...phase, taken } } : state);
}

function onCommand(
  state: PlayState,
  command: PlayCommand,
  at: number,
): PlayStep {
  const { phase } = state;
  switch (command.kind) {
    case "take":
      return phase.kind === "reading"
        ? take(state, phase, { cell: command.cell, at })
        : stay(state);
    case "skip":
      return phase.kind === "reading"
        ? readQuestion(
            finishQuestion(state, phase.poem, null),
            state.index + 1,
            at,
          )
        : stay(state);
    case "next":
      return phase.kind === "judged"
        ? readQuestion(state, state.index + 1, at)
        : stay(state);
  }
}

function onTimer(state: PlayState, event: PlayTimer, at: number): PlayStep {
  const { phase } = state;
  if (event.question !== state.index) {
    return stay(state);
  }
  switch (event.kind) {
    case "letter":
      return phase.kind === "reading"
        ? stay({
            ...state,
            phase: { ...phase, shown: Math.max(phase.shown, event.shown) },
          })
        : stay(state);
    case "judge":
      return phase.kind === "reading" ? onJudge(state, phase) : stay(state);
    case "auto-next":
      return phase.kind === "judged"
        ? readQuestion(state, state.index + 1, at)
        : stay(state);
  }
}

export const PLAY: PracticeMode<
  PlayInput,
  PlayState,
  PlayCommand,
  PlayTimer,
  PlayView
> = {
  start: (input, at) =>
    readQuestion(
      {
        input,
        index: 0,
        removed: [],
        phase: { kind: "finished" },
        results: [],
      },
      0,
      at,
    ),
  update: (state, message: Message<PlayCommand, PlayTimer>) =>
    message.kind === "command"
      ? onCommand(state, message.command, message.at)
      : onTimer(state, message.event, message.at),
  view: playView,
};
