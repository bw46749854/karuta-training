// A clock and scheduler for tests that move only when told to. Test code
// only: it is left out of coverage and mutation testing.
import type { Clock, Scheduler } from "../ports";

interface Timer {
  readonly at: number;
  readonly order: number;
  readonly callback: () => void;
}

export class FakeTime implements Clock, Scheduler {
  #now = 0;
  #order = 0;
  #timers = new Set<Timer>();

  now(): number {
    return this.#now;
  }

  schedule(afterMs: number, callback: () => void): () => void {
    const timer = { at: this.#now + afterMs, order: this.#order++, callback };
    this.#timers.add(timer);
    return () => this.#timers.delete(timer);
  }

  /** Moves the time on, calling every timer that comes due in order. */
  advance(ms: number): void {
    const end = this.#now + ms;
    for (;;) {
      const next = [...this.#timers]
        .filter((timer) => timer.at <= end)
        .sort((a, b) => a.at - b.at || a.order - b.order)[0];
      if (next === undefined) {
        break;
      }
      this.#timers.delete(next);
      this.#now = next.at;
      next.callback();
    }
    this.#now = end;
  }

  get pending(): number {
    return this.#timers.size;
  }
}
