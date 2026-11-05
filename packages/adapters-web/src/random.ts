import type { Random } from "@karuta/application";

/** Math.random made into an integer from 0 up to bound (ADR-0002 §2). */
export function webRandom(): Random {
  return (bound) => Math.floor(Math.random() * bound);
}
