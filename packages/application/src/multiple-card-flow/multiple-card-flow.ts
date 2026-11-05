import {
  judgeMultipleAnswers,
  kimariji,
  type MultipleCardQuestion,
  type Orientation,
  type PoemId,
} from "@karuta/domain";
import type { Effect, PracticeMode, Step } from "../practice/contract";
import {
  candidatesAfter,
  kimarijiRows,
  staticKimariji,
  type CardResult,
  type KimarijiRow,
  type ListOrder,
} from "../practice/kimariji-list";

// 札流し（複数枚） (spec 06), as a practice mode (ADR-0004).

export interface MultipleCardFlowInput {
  readonly questions: readonly MultipleCardQuestion[];
  readonly targets: readonly PoemId[];
  readonly romajiAllowed: boolean;
  readonly kimarijiChange: boolean;
  readonly autoNext: boolean;
  readonly waitMs: number;
  readonly displayMs: number;
}

export type MultipleCardFlowCommand =
  | { readonly kind: "input"; readonly text: string }
  | { readonly kind: "answer" }
  | { readonly kind: "skip" }
  | { readonly kind: "next" };

/** Raised for the question it was scheduled for (ADR-0004 §3). */
export interface MultipleCardFlowTimer {
  readonly kind: "hide" | "auto-next";
  readonly question: number;
}

/** Spec 06 §5.2: an input that was not taken, and why. */
export type Notice = "separators-only" | "too-many";

type Phase =
  | {
      readonly kind: "asking";
      readonly question: MultipleCardQuestion;
      readonly input: string;
      readonly hidden: boolean;
      readonly notice: Notice | null;
    }
  | {
      readonly kind: "judged";
      readonly question: MultipleCardQuestion;
      readonly input: string;
      readonly correct: boolean;
    }
  | { readonly kind: "finished" };

export interface MultipleCardFlowState {
  readonly input: MultipleCardFlowInput;
  readonly index: number;
  readonly phase: Phase;
  /** The finished cards, question by question, each in place order. */
  readonly results: readonly CardResult[];
}

export interface MultipleCardFlowView {
  readonly progress: { readonly finished: number; readonly total: number };
  /** The current question's cards, place 1 first (spec 06 §3.3). */
  readonly cards: readonly {
    readonly position: number;
    readonly poem: PoemId;
    readonly hidden: boolean;
  }[];
  readonly orientation: Orientation | null;
  readonly input: string;
  readonly inputLocked: boolean;
  readonly judgement: { readonly correct: boolean } | null;
  readonly notice: Notice | null;
  readonly finished: boolean;
  readonly actions: {
    readonly answer: boolean;
    readonly skip: boolean;
    readonly next: boolean;
  };
  readonly list: Readonly<Record<ListOrder, readonly KimarijiRow[]>>;
}

type MultipleStep = Step<MultipleCardFlowState, MultipleCardFlowTimer>;

const HIDE_KEY = "hide";
const NEXT_KEY = "next";

function phaseAt(input: MultipleCardFlowInput, index: number): Phase {
  const question = input.questions[index];
  return question === undefined
    ? { kind: "finished" }
    : { kind: "asking", question, input: "", hidden: false, notice: null };
}

/** Spec 06 §4.1: each question's cards are hidden after the display time. */
function hideLater(
  input: MultipleCardFlowInput,
  index: number,
): Effect<MultipleCardFlowTimer>[] {
  return index < input.questions.length
    ? [
        {
          kind: "schedule",
          key: HIDE_KEY,
          afterMs: input.displayMs,
          event: { kind: "hide", question: index },
        },
      ]
    : [];
}

/** Spec 06 §5.4: the kimariji as the question came out, card by card. */
function askedKimariji(
  state: MultipleCardFlowState,
  question: MultipleCardQuestion,
): string[] {
  const before = state.input.questions
    .slice(0, state.index)
    .flatMap((earlier) => earlier.poems);
  const candidates = candidatesAfter(state.input.kimarijiChange, before);
  return question.poems.map((poem) => kimariji(poem, candidates));
}

function finish(
  state: MultipleCardFlowState,
  question: MultipleCardQuestion,
  outcomeAt: (place: number) => CardResult["outcome"],
): readonly CardResult[] {
  const asked = askedKimariji(state, question);
  return [
    ...state.results,
    ...question.poems.map((poem, place) => ({
      poem,
      outcome: outcomeAt(place),
      changed: asked[place] !== staticKimariji(poem),
    })),
  ];
}

function stay(state: MultipleCardFlowState): MultipleStep {
  return { state, effects: [] };
}

function advance(state: MultipleCardFlowState): MultipleStep {
  const index = state.index + 1;
  return {
    state: { ...state, index, phase: phaseAt(state.input, index) },
    effects: [
      { kind: "cancel", key: NEXT_KEY },
      { kind: "cancel", key: HIDE_KEY },
      ...hideLater(state.input, index),
    ],
  };
}

function answer(
  state: MultipleCardFlowState,
  phase: Extract<Phase, { kind: "asking" }>,
): MultipleStep {
  const result = judgeMultipleAnswers(
    phase.input,
    askedKimariji(state, phase.question),
    state.input.romajiAllowed,
  );
  if (result.kind === "not-accepted") {
    return result.reason === "empty"
      ? stay(state)
      : stay({
          ...state,
          phase: { ...phase, input: "", notice: result.reason },
        });
  }
  const { question, input } = phase;
  const judged: MultipleCardFlowState = {
    ...state,
    phase: { kind: "judged", question, input, correct: result.correct },
    results: finish(state, question, (place) =>
      result.cards[place] === true ? "correct" : "wrong",
    ),
  };
  const effects: Effect<MultipleCardFlowTimer>[] = [
    { kind: "cancel", key: HIDE_KEY },
  ];
  if (state.input.autoNext) {
    effects.push({
      kind: "schedule",
      key: NEXT_KEY,
      afterMs: state.input.waitMs,
      event: { kind: "auto-next", question: state.index },
    });
  }
  return { state: judged, effects };
}

function onCommand(
  state: MultipleCardFlowState,
  command: MultipleCardFlowCommand,
): MultipleStep {
  const { phase } = state;
  if (phase.kind === "asking") {
    switch (command.kind) {
      case "input":
        return stay({
          ...state,
          phase: { ...phase, input: command.text, notice: null },
        });
      case "answer":
        return answer(state, phase);
      case "skip":
        return advance({
          ...state,
          results: finish(state, phase.question, () => "skipped"),
        });
      case "next":
        return stay(state);
    }
  }
  return phase.kind === "judged" && command.kind === "next"
    ? advance(state)
    : stay(state);
}

function onTimer(
  state: MultipleCardFlowState,
  event: MultipleCardFlowTimer,
): MultipleStep {
  const { phase } = state;
  if (event.question !== state.index) {
    return stay(state);
  }
  if (event.kind === "hide" && phase.kind === "asking") {
    return stay({ ...state, phase: { ...phase, hidden: true } });
  }
  return event.kind === "auto-next" && phase.kind === "judged"
    ? advance(state)
    : stay(state);
}

function cardsOf(phase: Phase): MultipleCardFlowView["cards"] {
  if (phase.kind === "finished") {
    return [];
  }
  const hidden = phase.kind === "asking" && phase.hidden;
  return phase.question.poems.map((poem, place) => ({
    position: place + 1,
    poem,
    hidden,
  }));
}

function actionsOf(phase: Phase): MultipleCardFlowView["actions"] {
  const asking = phase.kind === "asking";
  return {
    answer: asking && phase.input !== "",
    skip: asking,
    next: phase.kind === "judged",
  };
}

function view(state: MultipleCardFlowState): MultipleCardFlowView {
  const { phase } = state;
  const current = phase.kind === "finished" ? undefined : phase;
  return {
    progress: {
      finished: state.results.length,
      total: state.input.questions.flatMap((question) => question.poems).length,
    },
    cards: cardsOf(phase),
    orientation: current?.question.orientation ?? null,
    input: current?.input ?? "",
    inputLocked: phase.kind !== "asking",
    judgement: phase.kind === "judged" ? { correct: phase.correct } : null,
    notice: phase.kind === "asking" ? phase.notice : null,
    finished: phase.kind === "finished",
    actions: actionsOf(phase),
    list: kimarijiRows({
      targets: state.input.targets,
      results: state.results,
      kimarijiChange: state.input.kimarijiChange,
    }),
  };
}

export const MULTIPLE_CARD_FLOW: PracticeMode<
  MultipleCardFlowInput,
  MultipleCardFlowState,
  MultipleCardFlowCommand,
  MultipleCardFlowTimer,
  MultipleCardFlowView
> = {
  start: (input) => ({
    state: { input, index: 0, phase: phaseAt(input, 0), results: [] },
    effects: hideLater(input, 0),
  }),
  update: (state, message) =>
    message.kind === "command"
      ? onCommand(state, message.command)
      : onTimer(state, message.event),
  view,
};
