import type { FormField } from "@karuta/application";
import { useState, type ReactNode } from "react";
import { itemLabel, optionLabel } from "./settings-wording";
import { WORDING } from "./wording";

type Edit = (path: string, input: boolean | string) => void;

// Spec 04 §7: the text stays as typed; the draft changes only when the
// application accepts it. The settings screen remounts this on reset.
function IntegerInput(props: {
  readonly field: Extract<FormField, { kind: "integer" }>;
  readonly onEdit: Edit;
}): ReactNode {
  const { field, onEdit } = props;
  const [text, setText] = useState(String(field.value));
  const id = `setting-${field.path}`;
  const messageId = `${id}-message`;
  return (
    <div className="setting-row">
      <label htmlFor={id}>{itemLabel(field.path)}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={1}
        value={text}
        aria-invalid={field.invalid}
        aria-describedby={field.invalid ? messageId : undefined}
        onChange={(event) => {
          setText(event.currentTarget.value);
          onEdit(field.path, event.currentTarget.value);
        }}
      />
      {field.invalid ? (
        <p id={messageId} className="setting-error">
          {WORDING.settings.integerRange(field.min, field.max)}
        </p>
      ) : null}
    </div>
  );
}

/** The input of one on/off, whole-number or choice item (spec 04 §4.4). */
export function SettingInput(props: {
  readonly field: FormField;
  readonly onEdit: Edit;
}): ReactNode {
  const { field, onEdit } = props;
  const id = `setting-${field.path}`;
  switch (field.kind) {
    case "flag":
      return (
        <div className="setting-row">
          <input
            id={id}
            type="checkbox"
            checked={field.value}
            onChange={(event) => {
              onEdit(field.path, event.currentTarget.checked);
            }}
          />
          <label htmlFor={id}>{itemLabel(field.path)}</label>
        </div>
      );
    case "choice":
      return (
        <div className="setting-row">
          <label htmlFor={id}>{itemLabel(field.path)}</label>
          <select
            id={id}
            value={field.value}
            onChange={(event) => {
              onEdit(field.path, event.currentTarget.value);
            }}
          >
            {field.options.map((option) => (
              <option key={option} value={option}>
                {optionLabel(option)}
              </option>
            ))}
          </select>
        </div>
      );
    case "integer":
      return <IntegerInput field={field} onEdit={onEdit} />;
  }
}
