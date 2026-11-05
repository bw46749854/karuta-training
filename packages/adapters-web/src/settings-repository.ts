import type { BoardRepository, SettingsRepository } from "@karuta/application";

/** Keeps one document in the browser's storage under a key, as JSON. */
function storedDocument(
  storage: Storage,
  key: string,
): SettingsRepository & BoardRepository {
  return {
    load() {
      try {
        const text = storage.getItem(key);
        const document: unknown = text === null ? undefined : JSON.parse(text);
        return Promise.resolve(document);
      } catch {
        // Unreadable text, or storage the browser does not let us use: the
        // same as nothing saved (ADR-0003 §4).
        return Promise.resolve(undefined);
      }
    },
    save(document) {
      try {
        storage.setItem(key, JSON.stringify(document));
        return Promise.resolve("saved");
      } catch {
        // Full or not allowed. The caller keeps what it has (ADR-0003 §6).
        return Promise.resolve("failed");
      }
    },
  };
}

// One key for each saved document (ADR-0003 §3). The sample's saved data is
// not carried over (ADR-0003), so the keys are not the sample's.

/** The settings document. */
export function webSettingsRepository(storage: Storage): SettingsRepository {
  return storedDocument(storage, "karuta-training.settings");
}

/** The board handed from the placement memory to the play (spec 08 §2.2). */
export function webBoardRepository(storage: Storage): BoardRepository {
  return storedDocument(storage, "karuta-training.board");
}
