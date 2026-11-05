import type { Clock } from "@karuta/application";

/** The time since the page was opened, which never goes back. */
export function webClock(): Clock {
  return { now: () => performance.now() };
}
