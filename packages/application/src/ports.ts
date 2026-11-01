import type { RandomInt } from "@karuta/domain";

/** The current time in milliseconds, never going back (principles §2.2). */
export interface Clock {
  now(): number;
}

/** Calls back after a delay. The returned function cancels the call. */
export interface Scheduler {
  schedule(afterMs: number, callback: () => void): () => void;
}

/** An integer from 0 up to, but not including, bound (ADR-0002 §1). */
export type Random = RandomInt;
