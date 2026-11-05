import type { ReactNode } from "react";

/** A titled list of toggle buttons, each pressed when selected. */
export function ToggleList<Key extends number | string>(props: {
  readonly id: string;
  readonly title: string;
  readonly items: readonly {
    readonly key: Key;
    readonly label: string;
    readonly selected: boolean;
  }[];
  readonly onToggle: (key: Key) => void;
  /** Spec 07 §5.1: shown but not usable. */
  readonly disabled?: boolean;
}): ReactNode {
  return (
    <section aria-labelledby={`${props.id}-title`}>
      <h3 id={`${props.id}-title`}>{props.title}</h3>
      <ul className="toggle-list">
        {props.items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              aria-pressed={item.selected}
              disabled={props.disabled === true}
              onClick={() => {
                props.onToggle(item.key);
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
