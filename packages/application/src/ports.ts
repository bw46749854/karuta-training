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

/**
 * Keeps one saved document as it is. Checking it and filling in what is
 * missing is application's job, not the store's (ADR-0003 §5).
 */
export interface SettingsRepository {
  /** The saved document, or undefined when none is saved or it is unreadable. */
  load(): Promise<unknown>;
  /** Saves the document in place of the one before. */
  save(document: unknown): Promise<"saved" | "failed">;
}
