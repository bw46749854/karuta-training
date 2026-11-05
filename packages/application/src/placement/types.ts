import type {
  Board,
  BoardShape,
  PlacementMode,
  PlacementQuestion,
  PoemId,
} from "@karuta/domain";
import type { Outcome } from "../practice/contract";
import type { AfterAnswer } from "../settings/definition";

// 配置暗記 (spec 07): the types of the mode, apart so that the transition
// and the view can both use them.

export interface PlacementInput {
  readonly board: Board;
  readonly targets: readonly PoemId[];
  readonly mode: PlacementMode;
  readonly excludeDead: boolean;
  readonly showAnswer: AfterAnswer;
  readonly allowCheck: AfterAnswer;
  readonly autoNext: boolean;
  readonly waitMs: number;
}

export type PlacementCommand =
  | { readonly kind: "flip-cell"; readonly cell: number }
  | { readonly kind: "flip-poem"; readonly poem: PoemId }
  | { readonly kind: "flip-group"; readonly name: string }
  | { readonly kind: "invert" }
  | {
      readonly kind: "start";
      /** Made with the Random port before (ADR-0004 §6). */
      readonly questions: readonly PlacementQuestion[];
    }
  | { readonly kind: "answer" }
  | { readonly kind: "skip" }
  | { readonly kind: "next" }
  | { readonly kind: "end" };

export interface PlacementTimer {
  readonly kind: "auto-next";
  readonly question: number;
}

interface Asked {
  readonly questions: readonly PlacementQuestion[];
  readonly index: number;
  /** The question at the index. */
  readonly question: PlacementQuestion;
  readonly selected: readonly number[];
}

export type Phase =
  | { readonly kind: "memorizing"; readonly notice: "all-asked" | null }
  | ({ readonly kind: "asking" } & Asked)
  | ({
      readonly kind: "judged";
      readonly correct: boolean;
      /** Spec 07 §5.6: whether the cards may be turned to check. */
      readonly checking: boolean;
    } & Asked);

export interface PlacementState {
  readonly input: PlacementInput;
  /** For each cell, whether its card is face down. */
  readonly faceDown: readonly boolean[];
  readonly phase: Phase;
  readonly results: readonly Outcome[];
}

export interface PlacementView {
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
  readonly groups: readonly {
    readonly name: string;
    readonly selected: boolean;
  }[];
  readonly poems: readonly {
    readonly id: PoemId;
    readonly kimariji: string;
    readonly selected: boolean;
  }[];
  readonly question: string | null;
  readonly judgement: { readonly correct: boolean } | null;
  readonly progress: {
    readonly finished: number;
    readonly total: number;
  } | null;
  readonly notice: "all-asked" | null;
  /** What can be done now (ADR-0006 §4). */
  readonly actions: {
    /** Turn cards over, on the board or from the lists. */
    readonly flip: boolean;
    /** Choose cells as the answer. */
    readonly select: boolean;
    readonly invert: boolean;
    readonly redeal: boolean;
    readonly start: boolean;
    readonly answer: boolean;
    readonly skip: boolean;
    readonly next: boolean;
    readonly end: boolean;
  };
}
