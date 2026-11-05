import { useEffect, useRef, type ReactNode } from "react";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;

/** The commands the card flows share (spec 05 §4 to §5, spec 06 §5 to §6). */
export type AnswerCommand =
  | { readonly kind: "input"; readonly text: string }
  | { readonly kind: "answer" }
  | { readonly kind: "skip" }
  | { readonly kind: "next" };

/** What the answer form shows, from the mode's view. */
export interface AnswerView {
  readonly input: string;
  readonly inputLocked: boolean;
  readonly finished: boolean;
  readonly actions: {
    readonly answer: boolean;
    readonly skip: boolean;
    readonly next: boolean;
  };
}

/**
 * The answer, and the one button that skips before judging and goes on
 * after (spec 05 §5). The next thing to do gets the focus, for keyboard and
 * controller (principles §2.4); turn changes when a new question comes.
 */
export function AnswerForm(props: {
  readonly view: AnswerView;
  readonly turn: unknown;
  readonly dispatch: (command: AnswerCommand) => void;
}): ReactNode {
  const { view, dispatch } = props;
  const input = useRef<HTMLInputElement>(null);
  const move = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    (view.actions.next ? move : input).current?.focus();
  }, [view.actions.next, props.turn]);
  return (
    <form
      className="answer-form"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ kind: "answer" });
      }}
    >
      <label htmlFor="answer-input">{C.input}</label>
      <input
        id="answer-input"
        ref={input}
        type="text"
        autoComplete="off"
        value={view.input}
        readOnly={view.inputLocked}
        disabled={view.finished}
        onChange={(event) => {
          dispatch({ kind: "input", text: event.currentTarget.value });
        }}
      />
      <button type="submit" disabled={!view.actions.answer}>
        {C.answer}
      </button>
      {view.actions.skip || view.actions.next ? (
        <button
          type="button"
          ref={move}
          onClick={() => {
            dispatch({ kind: view.actions.next ? "next" : "skip" });
          }}
        >
          {view.actions.next ? C.next : C.skip}
        </button>
      ) : null}
    </form>
  );
}

/** Spec 05 §3.2: the progress as n / N and a bar, side by side. */
export function Progress(props: {
  readonly finished: number;
  readonly total: number;
}): ReactNode {
  return (
    <div className="progress">
      <p>{C.progressText(props.finished, props.total)}</p>
      <progress
        max={props.total}
        value={props.finished}
        aria-label={C.progress}
      />
    </div>
  );
}
