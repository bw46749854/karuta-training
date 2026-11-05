import type { Scheduler } from "@karuta/application";

/** The browser's timers. */
export function webScheduler(): Scheduler {
  return {
    schedule(afterMs, callback) {
      const timer = setTimeout(callback, afterMs);
      return () => {
        clearTimeout(timer);
      };
    },
  };
}
