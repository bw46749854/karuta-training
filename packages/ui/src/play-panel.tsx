import type { PlayCommand, PlayView } from "@karuta/application";
import type { ReactNode } from "react";
import { Progress } from "./answer-form";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;
const Y = WORDING.play;

function statusText(view: PlayView): string {
  if (view.finished) {
    return Y.allRead;
  }
  const { judgement } = view;
  switch (judgement?.kind) {
    case undefined:
      return "";
    case "correct":
      return Y.correct;
    case "dead":
      return Y.dead;
    case "wrong-card":
      return Y.wrongCard;
    case "missed":
      return Y.missed;
    case "early":
      return Y.early(judgement.seconds);
    case "late":
      return Y.late(judgement.seconds);
  }
}

/** Spec 08 §7.3: the letters out so far, the judgement, the progress. */
export function PlayPanel(props: {
  readonly view: PlayView;
  readonly dispatch: (command: PlayCommand) => void;
  readonly onFinish: () => void;
}): ReactNode {
  const { view, dispatch } = props;
  const { actions } = view;
  return (
    <div className="placement-panel">
      {view.letters === "" ? null : (
        <p className="question">{Y.letters(view.letters)}</p>
      )}
      <Progress {...view.progress} />
      <p role="status">{statusText(view)}</p>
      <div className="setting-actions">
        <button
          type="button"
          disabled={!actions.skip && !actions.next}
          onClick={() => {
            dispatch({ kind: actions.next ? "next" : "skip" });
          }}
        >
          {actions.next ? C.next : C.skip}
        </button>
        <button type="button" onClick={props.onFinish}>
          {Y.finish}
        </button>
      </div>
    </div>
  );
}
