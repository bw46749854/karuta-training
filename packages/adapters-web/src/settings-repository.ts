import type { SettingsRepository } from "@karuta/application";

// One key for the whole document (ADR-0003 §3). The sample's saved data is
// not carried over (ADR-0003), so the key is not the sample's.
const KEY = "karuta-training.settings";

/** Keeps the settings document in the browser's storage, as JSON. */
export function webSettingsRepository(storage: Storage): SettingsRepository {
  return {
    load() {
      try {
        const text = storage.getItem(KEY);
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
        storage.setItem(KEY, JSON.stringify(document));
        return Promise.resolve("saved");
      } catch {
        // Full or not allowed. The caller keeps the draft (ADR-0003 §6).
        return Promise.resolve("failed");
      }
    },
  };
}
