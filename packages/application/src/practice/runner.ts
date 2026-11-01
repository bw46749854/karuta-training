import type { Clock, Scheduler } from "../ports";
import type { Effect, Message, PracticeMode } from "./contract";

/** A running practice session, as the screen sees it. */
export interface Session<Command, View> {
  view(): View;
  dispatch(command: Command): void;
  subscribe(listener: (view: View) => void): () => void;
  dispose(): void;
}

interface Time {
  readonly clock: Clock;
  readonly scheduler: Scheduler;
}

// Carries out the timer effects (ADR-0004 §3). Scheduling a key again
// replaces its earlier timer.
function timerTable<TimerEvent>(
  time: Time,
  raise: (event: TimerEvent) => void,
) {
  const cancels = new Map<string, () => void>();
  const cancel = (key: string) => {
    cancels.get(key)?.();
    cancels.delete(key);
  };
  return {
    apply(effects: readonly Effect<TimerEvent>[]): void {
      for (const effect of effects) {
        cancel(effect.key);
        if (effect.kind === "schedule") {
          const run = () => {
            cancels.delete(effect.key);
            raise(effect.event);
          };
          cancels.set(effect.key, time.scheduler.schedule(effect.afterMs, run));
        }
      }
    },
    cancelAll(): void {
      for (const key of [...cancels.keys()]) {
        cancel(key);
      }
    },
  };
}

/**
 * Runs a practice mode (ADR-0004): stamps each command and timer event with
 * the time, steps the mode, carries out its effects, and tells listeners.
 * After dispose, every timer is cancelled and nothing more happens.
 */
export function runSession<Input, State, Command, TimerEvent, View>(
  mode: PracticeMode<Input, State, Command, TimerEvent, View>,
  input: Input,
  time: Time,
): Session<Command, View> {
  const listeners = new Set<(view: View) => void>();
  let disposed = false;
  const deliver = (message: Message<Command, TimerEvent>) => {
    if (disposed) {
      return;
    }
    const step = mode.update(state, message);
    state = step.state;
    timers.apply(step.effects);
    const current = mode.view(state);
    for (const listener of listeners) {
      listener(current);
    }
  };
  const timers = timerTable<TimerEvent>(time, (event) => {
    deliver({ kind: "timer", event, at: time.clock.now() });
  });
  const first = mode.start(input, time.clock.now());
  let state = first.state;
  timers.apply(first.effects);
  return {
    view: () => mode.view(state),
    dispatch: (command) => {
      deliver({ kind: "command", command, at: time.clock.now() });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      disposed = true;
      timers.cancelAll();
      listeners.clear();
    },
  };
}
