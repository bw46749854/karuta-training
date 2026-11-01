// The contract every practice mode keeps (ADR-0004). A mode is pure: it
// takes its state and a message and returns the next state and effects.

/** The shared result of a question or card (ADR-0004 §5). */
export type Outcome = "correct" | "wrong" | "skipped";

/**
 * Side effects as data (ADR-0004 §3). The runner carries them out: it raises
 * the event after the delay, unless the key is cancelled or scheduled again.
 */
export type Effect<TimerEvent> =
  | {
      readonly kind: "schedule";
      readonly key: string;
      readonly afterMs: number;
      readonly event: TimerEvent;
    }
  | { readonly kind: "cancel"; readonly key: string };

export interface Step<State, TimerEvent> {
  readonly state: State;
  readonly effects: readonly Effect<TimerEvent>[];
}

/** A command from the screen, or an event the mode scheduled, with its time. */
export type Message<Command, TimerEvent> =
  | { readonly kind: "command"; readonly command: Command; readonly at: number }
  | { readonly kind: "timer"; readonly event: TimerEvent; readonly at: number };

export interface PracticeMode<Input, State, Command, TimerEvent, View> {
  start(input: Input, at: number): Step<State, TimerEvent>;
  update(
    state: State,
    message: Message<Command, TimerEvent>,
  ): Step<State, TimerEvent>;
  view(state: State): View;
}
