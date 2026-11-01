import { expect, test } from "vitest";
import { MemoryRepository } from "../test-support/memory-repository";
import { DEFAULT_SETTINGS, type Settings } from "./definition";
import { loadSettings } from "./document";
import {
  changeDraft,
  discardDraft,
  resetDraft,
  saveDraft,
  startEditing,
} from "./editor";

const changed: Settings = {
  common: { ...DEFAULT_SETTINGS.common, limited: false },
};

test("ADR-0003 §6 編集を始めると、下書きは保存済みの値", () => {
  expect(startEditing(changed)).toEqual({ saved: changed, draft: changed });
});

test("ADR-0003 §6 項目を変えると、下書きだけが変わる", () => {
  expect(changeDraft(startEditing(DEFAULT_SETTINGS), changed)).toEqual({
    saved: DEFAULT_SETTINGS,
    draft: changed,
  });
});

test("ADR-0003 §6 取扱説明書 §6.4 リセットは下書きを初期値に戻すだけで、保存済みの値は変えない", () => {
  expect(resetDraft(startEditing(changed))).toEqual({
    saved: changed,
    draft: DEFAULT_SETTINGS,
  });
});

test("ADR-0003 §6 取扱説明書 §6.4 破棄すると、下書きは保存済みの値に戻る", () => {
  const editing = changeDraft(startEditing(DEFAULT_SETTINGS), changed);
  expect(discardDraft(editing)).toEqual({
    saved: DEFAULT_SETTINGS,
    draft: DEFAULT_SETTINGS,
  });
});

test("ADR-0003 §6 保存すると、保存先に書き、保存済みの値が下書きになる", async () => {
  const repository = new MemoryRepository();
  const editing = changeDraft(startEditing(DEFAULT_SETTINGS), changed);
  const { editor, result } = await saveDraft(editing, repository);
  expect(result).toBe("saved");
  expect(editor).toEqual({ saved: changed, draft: changed });
  expect(await loadSettings(repository)).toEqual(changed);
});

test("ADR-0003 §6 保存に失敗したら、保存済みの値も下書きも変えない", async () => {
  const repository = new MemoryRepository();
  repository.failSaves = true;
  const editing = changeDraft(startEditing(DEFAULT_SETTINGS), changed);
  const { editor, result } = await saveDraft(editing, repository);
  expect(result).toBe("failed");
  expect(editor).toEqual(editing);
});
