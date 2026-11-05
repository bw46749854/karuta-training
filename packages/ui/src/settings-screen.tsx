import {
  canSave,
  clearPoems,
  editField,
  loadSettings,
  poemSelection,
  resetDraft,
  saveDraft,
  selectAllPoems,
  settingsForm,
  startEditing,
  toggleCell,
  toggleGroup,
  togglePoem,
  type SettingsEditor,
  type SettingsRepository,
} from "@karuta/application";
import { useEffect, useState, type ReactNode } from "react";
import { ScreenFrame } from "./frame";
import { LayoutEditor } from "./layout-editor";
import { PoemSelection } from "./poem-selection";
import { SettingInput } from "./setting-inputs";
import { sectionTitle } from "./settings-wording";
import { WORDING } from "./wording";

const S = WORDING.settings;

function Section(props: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <section aria-labelledby={`${props.id}-title`} className="settings-section">
      <h2 id={`${props.id}-title`}>{props.title}</h2>
      {props.children}
    </section>
  );
}

function CommonPoems(props: {
  readonly editor: SettingsEditor;
  readonly onChange: (editor: SettingsEditor) => void;
}): ReactNode {
  const { editor, onChange } = props;
  return (
    <PoemSelection
      view={poemSelection(editor.draft)}
      onToggleGroup={(name) => {
        onChange(toggleGroup(editor, name));
      }}
      onTogglePoem={(poem) => {
        onChange(togglePoem(editor, poem));
      }}
      onSelectAll={() => {
        onChange(selectAllPoems(editor));
      }}
      onClear={() => {
        onChange(clearPoems(editor));
      }}
    />
  );
}

function Editing(props: {
  readonly editor: SettingsEditor;
  readonly generation: number;
  readonly onChange: (editor: SettingsEditor) => void;
}): ReactNode {
  const { editor, onChange } = props;
  const edit = (path: string, input: boolean | string) => {
    onChange(editField(editor, path, input));
  };
  return (
    <>
      {settingsForm(editor).map((section) => (
        <Section
          key={section.name}
          id={`settings-${section.name}`}
          title={sectionTitle(section.name)}
        >
          {section.fields.map((field) => (
            <SettingInput
              key={`${String(props.generation)}:${field.path}`}
              field={field}
              onEdit={edit}
            />
          ))}
          {section.name === "common" ? (
            <CommonPoems editor={editor} onChange={onChange} />
          ) : null}
        </Section>
      ))}
      <Section id="settings-layouts" title={S.sections.layouts}>
        <LayoutEditor
          layouts={editor.draft.common.layouts}
          onToggle={(shape, index) => {
            onChange(toggleCell(editor, shape, index));
          }}
        />
      </Section>
    </>
  );
}

const MESSAGES = { saved: S.saved, failed: S.saveFailed, none: "" };

type Message = keyof typeof MESSAGES;

function Actions(props: {
  readonly editor: SettingsEditor;
  readonly repository: SettingsRepository;
  readonly message: Message;
  readonly onSaved: (editor: SettingsEditor, message: Message) => void;
  readonly onReset: () => void;
}): ReactNode {
  const { editor, repository } = props;
  return (
    <div className="settings-actions">
      <button
        type="button"
        disabled={!canSave(editor)}
        onClick={() => {
          void saveDraft(editor, repository).then((saved) => {
            props.onSaved(saved.editor, saved.result);
          });
        }}
      >
        {S.save}
      </button>
      <button type="button" onClick={props.onReset}>
        {S.reset}
      </button>
      <p role="status">{MESSAGES[props.message]}</p>
    </div>
  );
}

/**
 * Spec 04: the settings screen. The editing rules are application's
 * (ADR-0003 §6); leaving the screen drops the draft (spec 04 §9.4).
 */
export function SettingsScreen(props: {
  readonly repository: SettingsRepository;
  readonly onBackToTop: () => void;
}): ReactNode {
  const { repository } = props;
  const [editor, setEditor] = useState<SettingsEditor>();
  const [message, setMessage] = useState<Message>("none");
  // Spec 04 §9.3: reset puts back what was typed too, so inputs start again.
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let open = true;
    void loadSettings(repository).then((settings) => {
      if (open) {
        setEditor(startEditing(settings));
      }
    });
    return () => {
      open = false;
    };
  }, [repository]);
  const change = (next: SettingsEditor) => {
    setEditor(next);
    setMessage("none");
  };
  return (
    <ScreenFrame title={S.title} onBackToTop={props.onBackToTop}>
      {editor === undefined ? (
        <p>{S.loading}</p>
      ) : (
        <>
          <Actions
            editor={editor}
            repository={repository}
            message={message}
            onSaved={(saved, result) => {
              setEditor(saved);
              setMessage(result);
            }}
            onReset={() => {
              change(resetDraft(editor));
              setGeneration(generation + 1);
            }}
          />
          <Editing editor={editor} generation={generation} onChange={change} />
        </>
      )}
    </ScreenFrame>
  );
}
