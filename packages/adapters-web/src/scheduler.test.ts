import { afterEach, beforeEach, vi } from "vitest";
import { schedulerContract } from "./test-support/contracts";
import { webScheduler } from "./scheduler";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

schedulerContract(webScheduler, (ms) => {
  vi.advanceTimersByTime(ms);
});
