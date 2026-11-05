import type { Board, BoardShape, PoemId } from "@karuta/domain";
import type { Outcome } from "../practice/contract";

// 実践練習 (spec 08): the types of the mode, apart so that the transition
// and the view can both use them.

export interface PlayInput {
  readonly board: Board;
  /** The poems to read, in order (spec 08 §3), made with the Random port. */
  readonly order: readonly PoemId[];
  readonly letterIntervalMs: number;
  readonly autoNext: boolean;
  readonly waitMs: number;
}

export type PlayCommand =
  | { readonly kind: "take"; readonly cell: number }
  | { readonly kind: "skip" }
  | { readonly kind: "next" };

/** Raised for the question it was scheduled for (ADR-0004 §3). */
export type PlayTimer =
  | {
      readonly kind: "letter";
      readonly question: number;
      /** How many letters are out once this one is. */
      readonly shown: number;
    }
  | { readonly kind: "judge" | "auto-next"; readonly question: number };

/** Spec 08 §5. */
export type PlayJudgement =
  | { readonly kind: "correct" }
  | { readonly kind: "dead" }
  | { readonly kind: "early"; readonly seconds: number }
  | { readonly kind: "late"; readonly seconds: number }
  | { readonly kind: "wrong-card" }
  | { readonly kind: "missed" };

export type Phase =
  | {
      readonly kind: "reading";
      readonly poem: PoemId;
      readonly startedAt: number;
      readonly shown: number;
      readonly taken: { readonly cell: number; readonly at: number } | null;
    }
  | {
      readonly kind: "judged";
      readonly poem: PoemId;
      readonly judgement: PlayJudgement;
      readonly taken: number | null;
    }
  | { readonly kind: "finished" };

interface PlayResult {
  readonly poem: PoemId;
  readonly outcome: Outcome;
  readonly judgement: PlayJudgement | null;
}

export interface PlayState {
  readonly input: PlayInput;
  readonly index: number;
  /** The cells whose cards have been read and taken away (spec 08 §4.4). */
  readonly removed: readonly number[];
  readonly phase: Phase;
  readonly results: readonly PlayResult[];
}

export interface PlayView {
  readonly shape: BoardShape;
  readonly cells: readonly {
    readonly index: number;
    readonly row: number;
    readonly column: number;
    readonly side: "opponent" | "own";
    readonly poem: PoemId | null;
    readonly faceUp: boolean;
    readonly selected: boolean;
  }[];
  /** The letters out so far (spec 08 §7.3). */
  readonly letters: string;
  readonly judgement: PlayJudgement | null;
  readonly progress: { readonly finished: number; readonly total: number };
  readonly finished: boolean;
  readonly actions: {
    readonly take: boolean;
    readonly skip: boolean;
    readonly next: boolean;
  };
}
