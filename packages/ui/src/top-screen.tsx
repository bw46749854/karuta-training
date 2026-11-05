import type { ReactNode } from "react";
import { ScreenFrame } from "./frame";
import { WORDING } from "./wording";

/** The screens the top screen opens, in its order (spec 04 §2.2). */
export const TOP_ENTRIES = ["settings"] as const;

export type TopEntry = (typeof TOP_ENTRIES)[number];

export function TopScreen(props: {
  readonly onOpen: (entry: TopEntry) => void;
}): ReactNode {
  return (
    <ScreenFrame title={WORDING.top.title}>
      <ul className="top-entries">
        {TOP_ENTRIES.map((entry) => (
          <li key={entry}>
            <button
              type="button"
              onClick={() => {
                props.onOpen(entry);
              }}
            >
              {WORDING.top.open[entry]}
            </button>
          </li>
        ))}
      </ul>
    </ScreenFrame>
  );
}
