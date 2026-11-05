import type { PlacementCommand, PlacementView } from "@karuta/application";
import type { ReactNode } from "react";
import { Progress } from "./answer-form";
import { ToggleList } from "./toggle-list";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;
const P = WORDING.placement;
const S = WORDING.settings;

type Dispatch = (command: PlacementCommand) => void;

function statusText(view: PlacementView): string {
  if (view.notice === "all-asked") {
    return P.allAsked;
  }
  if (view.judgement === null) {
    return "";
  }
  return view.judgement.correct ? P.correct : P.wrong;
}

/** Spec 07 §4, §5: every button stays; the ones that cannot be used now look so. */
function Buttons(props: {
  readonly view: PlacementView;
  readonly dispatch: Dispatch;
  readonly onStart: () => void;
  readonly onRedeal: () => void;
}): ReactNode {
  const { actions } = props.view;
  const { dispatch } = props;
  const button = (label: string, enabled: boolean, onClick: () => void) => (
    <button type="button" disabled={!enabled} onClick={onClick}>
      {label}
    </button>
  );
  return (
    <div className="setting-actions">
      {button(P.start, actions.start, props.onStart)}
      {button(P.invert, actions.invert, () => {
        dispatch({ kind: "invert" });
      })}
      {button(P.redeal, actions.redeal, props.onRedeal)}
      {button(C.answer, actions.answer, () => {
        dispatch({ kind: "answer" });
      })}
      {button(
        actions.next ? C.next : C.skip,
        actions.skip || actions.next,
        () => {
          dispatch({ kind: actions.next ? "next" : "skip" });
        },
      )}
      {button(P.end, actions.end, () => {
        dispatch({ kind: "end" });
      })}
    </div>
  );
}

/** Spec 07 §3.2: the question, the judgement, the buttons and the lists. */
export function PlacementPanel(props: {
  readonly view: PlacementView;
  readonly dispatch: Dispatch;
  readonly onStart: () => void;
  readonly onRedeal: () => void;
}): ReactNode {
  const { view, dispatch } = props;
  const disabled = !view.actions.flip;
  return (
    <div className="placement-panel">
      {view.question === null ? null : (
        <p className="question">{P.question(view.question)}</p>
      )}
      {view.progress === null ? null : <Progress {...view.progress} />}
      <p role="status">{statusText(view)}</p>
      <Buttons {...props} />
      <ToggleList
        id="placement-groups"
        title={S.groups}
        items={view.groups.map((group) => ({
          key: group.name,
          label: group.name,
          selected: group.selected,
        }))}
        onToggle={(name) => {
          dispatch({ kind: "flip-group", name });
        }}
        disabled={disabled}
      />
      <ToggleList
        id="placement-poems"
        title={S.poems}
        items={view.poems.map((poem) => ({
          key: poem.id,
          label: S.poem(poem.id, poem.kimariji),
          selected: poem.selected,
        }))}
        onToggle={(poem) => {
          dispatch({ kind: "flip-poem", poem });
        }}
        disabled={disabled}
      />
    </div>
  );
}
