// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { settingsRepositoryContract } from "./test-support/contracts";
import { webSettingsRepository } from "./settings-repository";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

settingsRepositoryContract(() => webSettingsRepository(localStorage));

test("ADR-0003 §5 保存した文書は、次に開いたときも読める", async () => {
  await webSettingsRepository(localStorage).save({ version: 1 });
  await expect(webSettingsRepository(localStorage).load()).resolves.toEqual({
    version: 1,
  });
});

test("ADR-0003 §4 読めない文書は、保存していないのと同じ", async () => {
  const repository = webSettingsRepository(localStorage);
  await repository.save({ version: 1 });
  for (const key of Object.keys(localStorage)) {
    localStorage.setItem(key, "{broken");
  }
  await expect(repository.load()).resolves.toBeUndefined();
});

test("ADR-0003 §6 保存先が使えないときは、保存できなかったと返し、読むと undefined", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
  const repository = webSettingsRepository(localStorage);
  await expect(repository.save({ version: 1 })).resolves.toBe("failed");
  await expect(repository.load()).resolves.toBeUndefined();
});
