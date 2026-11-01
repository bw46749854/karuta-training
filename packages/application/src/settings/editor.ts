import type { SettingsRepository } from "../ports";
import { DEFAULT_SETTINGS, type Settings } from "./definition";
import { saveSettings } from "./document";

/** The settings screen's saved values and the draft being edited (ADR-0003 §6). */
export interface SettingsEditor {
  readonly saved: Settings;
  readonly draft: Settings;
}

export function startEditing(saved: Settings): SettingsEditor {
  return { saved, draft: saved };
}

export function changeDraft(
  editor: SettingsEditor,
  draft: Settings,
): SettingsEditor {
  return { ...editor, draft };
}

/** Manual §6.4: reset puts the defaults on the screen and does not save. */
export function resetDraft(editor: SettingsEditor): SettingsEditor {
  return { ...editor, draft: DEFAULT_SETTINGS };
}

/** Manual §6.4: leaving without saving throws the changes away. */
export function discardDraft(editor: SettingsEditor): SettingsEditor {
  return { ...editor, draft: editor.saved };
}

/** Saves the draft. When saving fails, nothing changes. */
export async function saveDraft(
  editor: SettingsEditor,
  repository: SettingsRepository,
): Promise<{
  readonly editor: SettingsEditor;
  readonly result: "saved" | "failed";
}> {
  const result = await saveSettings(repository, editor.draft);
  return {
    editor: result === "saved" ? startEditing(editor.draft) : editor,
    result,
  };
}
