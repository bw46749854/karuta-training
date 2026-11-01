// A settings store kept in memory, for tests. Test code only: it is left out
// of coverage and mutation testing.
import type { SettingsRepository } from "../ports";

export class MemoryRepository implements SettingsRepository {
  document: unknown;
  failSaves = false;

  load(): Promise<unknown> {
    return Promise.resolve(this.document);
  }

  save(document: unknown): Promise<"saved" | "failed"> {
    if (this.failSaves) {
      return Promise.resolve("failed");
    }
    this.document = document;
    return Promise.resolve("saved");
  }
}
