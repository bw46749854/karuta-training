// Contract tests (principles §3.1): every implementation of a port passes
// the same tests. Each adapter's test file runs the contract of its port.
// Test code only: it is left out of coverage and mutation testing.
import type {
  BoardRepository,
  CardFaceProvider,
  Clock,
  Random,
  Scheduler,
  SettingsRepository,
} from "@karuta/application";
import { POEMS } from "@karuta/domain";
import { expect, test, vi } from "vitest";

export function clockContract(make: () => Clock): void {
  test("契約 Clock：時刻は戻らない", () => {
    const clock = make();
    let last = clock.now();
    for (let count = 0; count < 1000; count += 1) {
      const now = clock.now();
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });
}

/** The scheduler's time moves only when advance is called. */
export function schedulerContract(
  make: () => Scheduler,
  advance: (ms: number) => void,
): void {
  test("契約 Scheduler：待ち時間が経ってから、1回だけ呼ぶ", () => {
    const callback = vi.fn();
    make().schedule(100, callback);
    advance(99);
    expect(callback).not.toHaveBeenCalled();
    advance(1);
    expect(callback).toHaveBeenCalledTimes(1);
    advance(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("契約 Scheduler：取り消すと呼ばない。呼んだ後に取り消しても何も起きない", () => {
    const scheduler = make();
    const cancelled = vi.fn();
    const called = vi.fn();
    scheduler.schedule(100, cancelled)();
    const cancelCalled = scheduler.schedule(50, called);
    advance(100);
    cancelCalled();
    expect(cancelled).not.toHaveBeenCalled();
    expect(called).toHaveBeenCalledTimes(1);
  });

  test("契約 Scheduler：早く来るものから呼ぶ", () => {
    const scheduler = make();
    const order: string[] = [];
    scheduler.schedule(200, () => order.push("late"));
    scheduler.schedule(100, () => order.push("early"));
    advance(200);
    expect(order).toEqual(["early", "late"]);
  });
}

export function randomContract(make: () => Random): void {
  test("契約 Random：0 以上 n 未満の整数を返し、どの値も出る", () => {
    const random = make();
    for (const bound of [1, 2, 3, 6, 100]) {
      const seen = new Set<number>();
      for (let count = 0; count < bound * 200; count += 1) {
        const value = random(bound);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(bound);
        seen.add(value);
      }
      expect(seen.size).toBe(bound);
    }
  });
}

/**
 * The stores of saved documents (SettingsRepository, BoardRepository) keep
 * the same contract. make() gives a store with nothing saved yet.
 */
export function documentRepositoryContract(
  name: string,
  make: () => SettingsRepository | BoardRepository,
): void {
  test(`契約 ${name}：何も保存していなければ、読むと undefined`, async () => {
    await expect(make().load()).resolves.toBeUndefined();
  });

  test(`契約 ${name}：保存した文書を、そのまま読める`, async () => {
    const repository = make();
    const document = { version: 1, settings: { a: [true, 2, "3"] } };
    await expect(repository.save(document)).resolves.toBe("saved");
    await expect(repository.load()).resolves.toEqual(document);
  });

  test(`契約 ${name}：保存すると、前の文書と入れ替わる`, async () => {
    const repository = make();
    await repository.save({ version: 1, first: true });
    await repository.save({ version: 1, second: true });
    await expect(repository.load()).resolves.toEqual({
      version: 1,
      second: true,
    });
  });
}

export function cardFaceProviderContract(make: () => CardFaceProvider): void {
  test("契約 CardFaceProvider：100首すべての札面を返す", async () => {
    const provider = make();
    for (const poem of POEMS) {
      const face = await provider.face(poem.id);
      expect(face.text.length).toBeGreaterThan(0);
    }
  });
}
