import { afterEach, expect, test, vi } from "vitest";
import { randomContract } from "./test-support/contracts";
import { webRandom } from "./random";

afterEach(() => {
  vi.restoreAllMocks();
});

randomContract(webRandom);

test("ADR-0002 §5 乱数のアダプタ：0 なら 0、1 の直前なら n − 1 になる", () => {
  const random = webRandom();
  for (const bound of [1, 2, 6, 100]) {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(random(bound)).toBe(0);
    vi.spyOn(Math, "random").mockReturnValue(1 - Number.EPSILON / 2);
    expect(random(bound)).toBe(bound - 1);
  }
});
