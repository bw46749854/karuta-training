import {
  CandidateSet,
  judgeSingleAnswer,
  kimariji,
  POEMS,
  questionTargets,
  singleCardQuestions,
  type Orientation,
  type PoemId,
  type SingleCardQuestion,
  type UnconvertibleReason,
} from "@karuta/domain";
import type { Effect, Outcome, PracticeMode, Step } from "../practice/contract";
import type { Random } from "../ports";
import type { Settings } from "../settings/definition";

// 札流し (spec 05), as a practice mode (ADR-0004).

/** What the mode is given when a session starts (ADR-0004 §6). */
export interface CardFlowInput {
  readonly questions: readonly SingleCardQuestion[];
  /** The poems to practise with, for the kimariji list (spec 05 §8.2). */
  readonly targets: readonly PoemId[];
  readonly romajiAllowed: boolean;
  readonly kimarijiChange: boolean;
  readonly autoNext: boolean;
  readonly waitMs: number;
}

export type CardFlowCommand =
  | { readonly kind: "input"; readonly text: string }
  | { readonly kind: "answer" }
  | { readonly kind: "skip" }
  | { readonly kind: "next" };

/** Raised after the wait, for the question it was scheduled for. */
export interface CardFlowTimer {
  readonly kind: "auto-next";
  readonly question: number;
}

/** Spec 05 §4.3. */
export type Judgement =
  | { readonly kind: "correct" }
  | {
      readonly kind: "wrong";
      readonly kimariji: string;
      readonly reason: UnconvertibleReason | null;
    };

interface CardResult {
  readonly poem: PoemId;
  readonly outcome: Outcome;
  readonly changed: boolean;
}

type Phase =
  | {
      readonly kind: "asking";
      readonly question: SingleCardQuestion;
      readonly input: string;
    }
  | {
      readonly kind: "judged";
      readonly question: SingleCardQuestion;
      readonly input: string;
      readonly judgement: Judgement;
    }
  | { readonly kind: "finished" };

export interface CardFlowState {
  readonly input: CardFlowInput;
  /** The question being asked, from 0. */
  readonly index: number;
  readonly phase: Phase;
  /** The finished questions, in the order they were asked. */
  readonly results: readonly CardResult[];
}

export interface CardFlowView {
  readonly progress: { readonly finished: number; readonly total: number };
  readonly card: {
    readonly poem: PoemId;
    readonly orientation: Orientation;
  } | null;
  readonly input: string;
  readonly inputLocked: boolean;
  readonly judgement: Judgement | null;
  readonly finished: boolean;
  /** What can be done now (ADR-0006 §4). */
  readonly actions: {
    readonly answer: boolean;
    readonly skip: boolean;
    readonly next: boolean;
  };
  /** The kimariji list in both orders (spec 05 §8.5). */
  readonly list: Readonly<Record<ListOrder, readonly KimarijiRow[]>>;
}

const NEXT_KEY = "next";

const ALL_CANDIDATES = CandidateSet.afterReading([]);

/** With all 100 poems as candidates, this is the static kimariji. */
function staticKimariji(poem: PoemId): string {
  return kimariji(poem, ALL_CANDIDATES);
}

/** The candidates after these poems were read, or all 100 when off. */
function candidates(input: CardFlowInput, read: readonly PoemId[]) {
  return CandidateSet.afterReading(input.kimarijiChange ? read : []);
}

/** The question at the index, or the end when there are no more. */
function phaseAt(input: CardFlowInput, index: number): Phase {
  const question = input.questions[index];
  return question === undefined
    ? { kind: "finished" }
    : { kind: "asking", question, input: "" };
}

/** Spec 05 §4.4: the kimariji when the question came out. */
function askedKimariji(state: CardFlowState, poem: PoemId): string {
  const before = state.input.questions
    .slice(0, state.index)
    .map((question) => question.poem);
  return kimariji(poem, candidates(state.input, before));
}

function stay(state: CardFlowState): Step<CardFlowState, CardFlowTimer> {
  return { state, effects: [] };
}

function finish(
  state: CardFlowState,
  question: SingleCardQuestion,
  outcome: Outcome,
): readonly CardResult[] {
  const changed =
    askedKimariji(state, question.poem) !== staticKimariji(question.poem);
  return [...state.results, { poem: question.poem, outcome, changed }];
}

function advance(state: CardFlowState): Step<CardFlowState, CardFlowTimer> {
  const index = state.index + 1;
  return {
    state: { ...state, index, phase: phaseAt(state.input, index) },
    effects: [{ kind: "cancel", key: NEXT_KEY }],
  };
}

function answer(
  state: CardFlowState,
  question: SingleCardQuestion,
  input: string,
): Step<CardFlowState, CardFlowTimer> {
  const answerKimariji = askedKimariji(state, question.poem);
  const result = judgeSingleAnswer(
    input,
    answerKimariji,
    state.input.romajiAllowed,
  );
  if (result.kind === "not-accepted") {
    return stay(state);
  }
  const judgement: Judgement = result.correct
    ? { kind: "correct" }
    : {
        kind: "wrong",
        kimariji: answerKimariji,
        reason:
          result.answer.kind === "unconvertible" ? result.answer.reason : null,
      };
  const judged: CardFlowState = {
    ...state,
    phase: { kind: "judged", question, input, judgement },
    results: finish(state, question, judgement.kind),
  };
  const effects: Effect<CardFlowTimer>[] = state.input.autoNext
    ? [
        {
          kind: "schedule",
          key: NEXT_KEY,
          afterMs: state.input.waitMs,
          event: { kind: "auto-next", question: state.index },
        },
      ]
    : [];
  return { state: judged, effects };
}

function onCommand(
  state: CardFlowState,
  command: CardFlowCommand,
): Step<CardFlowState, CardFlowTimer> {
  const { phase } = state;
  if (phase.kind === "asking") {
    switch (command.kind) {
      case "input":
        return stay({ ...state, phase: { ...phase, input: command.text } });
      case "answer":
        return answer(state, phase.question, phase.input);
      case "skip":
        return advance({
          ...state,
          results: finish(state, phase.question, "skipped"),
        });
      case "next":
        return stay(state);
    }
  }
  return phase.kind === "judged" && command.kind === "next"
    ? advance(state)
    : stay(state);
}

export const CARD_FLOW: PracticeMode<
  CardFlowInput,
  CardFlowState,
  CardFlowCommand,
  CardFlowTimer,
  CardFlowView
> = {
  start: (input) =>
    stay({ input, index: 0, phase: phaseAt(input, 0), results: [] }),
  update: (state, message) => {
    if (message.kind === "command") {
      return onCommand(state, message.command);
    }
    const due =
      state.phase.kind === "judged" && message.event.question === state.index;
    return due ? advance(state) : stay(state);
  },
  view: (state) => {
    const { phase } = state;
    const asking = phase.kind === "finished" ? undefined : phase;
    const input = asking?.input ?? "";
    return {
      progress: {
        finished: state.results.length,
        total: state.input.questions.length,
      },
      card: asking?.question ?? null,
      input,
      inputLocked: phase.kind !== "asking",
      judgement: phase.kind === "judged" ? phase.judgement : null,
      finished: phase.kind === "finished",
      actions: {
        answer: phase.kind === "asking" && input !== "",
        skip: phase.kind === "asking",
        next: phase.kind === "judged",
      },
      list: {
        kimariji: kimarijiList(state, "kimariji"),
        asked: kimarijiList(state, "asked"),
      },
    };
  },
};

/** Spec 05 §2: the session's questions and settings, from the saved settings. */
export function cardFlowInput(
  settings: Settings,
  random: Random,
): CardFlowInput {
  const { cardFlow } = settings;
  const targets = questionTargets(
    settings.common.limited,
    settings.common.selected,
  );
  return {
    questions: singleCardQuestions(
      { targets, count: cardFlow.count, orientation: cardFlow.orientation },
      random,
    ),
    targets,
    romajiAllowed: cardFlow.romajiAllowed,
    kimarijiChange: cardFlow.kimarijiChange,
    autoNext: cardFlow.autoNext,
    waitMs: cardFlow.waitMs,
  };
}

/** Spec 05 §8.3. */
export interface KimarijiRow {
  readonly poem: PoemId;
  readonly kimariji: string;
  readonly status: "unread" | Outcome;
  readonly changed: boolean;
}

export type ListOrder = "kimariji" | "asked";

/** Spec 05 §8: the rows of the kimariji list, in the order asked for. */
export function kimarijiList(
  state: CardFlowState,
  order: ListOrder,
): KimarijiRow[] {
  const finished = new Map(
    state.results.map((result) => [result.poem, result]),
  );
  const now = candidates(
    state.input,
    state.results.map((result) => result.poem),
  );
  const row = (poem: PoemId): KimarijiRow => {
    const result = finished.get(poem);
    const kimarijiNow = result === undefined ? kimariji(poem, now) : "";
    return {
      poem,
      kimariji: staticKimariji(poem),
      status: result?.outcome ?? "unread",
      changed: result?.changed ?? kimarijiNow !== staticKimariji(poem),
    };
  };
  if (order === "asked") {
    return state.results.map((result) => row(result.poem));
  }
  const targets = new Set(state.input.targets);
  return POEMS.map((poem) => poem.id)
    .filter((poem) => targets.has(poem))
    .map(row);
}
