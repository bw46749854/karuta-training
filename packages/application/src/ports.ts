import type { PoemId, RandomInt } from "@karuta/domain";

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

/**
 * What a taking card shows. For now a face is text only: the provisional
 * faces show the poem number (the cloud session's brief §4). The real faces
 * come in stage 5 by swapping the adapter.
 */
export interface CardFace {
  readonly kind: "text";
  readonly text: string;
}

/**
 * The faces of the taking cards (principles §2.2). A face is loaded when a
 * screen shows that card, not at start-up (principles §3.5).
 */
export interface CardFaceProvider {
  face(poem: PoemId): Promise<CardFace>;
}
