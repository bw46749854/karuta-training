import type { PoemSelectionView } from "@karuta/application";
import type { PoemId } from "@karuta/domain";
import type { ReactNode } from "react";
import { ToggleList } from "./toggle-list";
import { WORDING } from "./wording";

const S = WORDING.settings;

/** Spec 04 §6: choosing poems by group or one by one. */
export function PoemSelection(props: {
  readonly view: PoemSelectionView;
  readonly onToggleGroup: (name: string) => void;
  readonly onTogglePoem: (poem: PoemId) => void;
  readonly onSelectAll: () => void;
  readonly onClear: () => void;
}): ReactNode {
  const { view } = props;
  return (
    <>
      <div className="setting-actions">
        <button type="button" onClick={props.onSelectAll}>
          {S.selectAll}
        </button>
        <button type="button" onClick={props.onClear}>
          {S.clearAll}
        </button>
      </div>
      <ToggleList
        id="poem-groups"
        title={S.groups}
        items={view.groups.map((group) => ({
          key: group.name,
          label: group.name,
          selected: group.selected,
        }))}
        onToggle={props.onToggleGroup}
      />
      <ToggleList
        id="poem-list"
        title={S.poems}
        items={view.poems.map((poem) => ({
          key: poem.id,
          label: S.poem(poem.id, poem.kimariji),
          selected: poem.selected,
        }))}
        onToggle={props.onTogglePoem}
      />
    </>
  );
}
