import {
  CARD_FLOW,
  cardFlowInput,
  type CardFaceProvider,
  type CardFlowCommand,
  type CardFlowView,
} from "@karuta/application";
import { useState, type ReactNode } from "react";
import { AnswerForm, Progress } from "./answer-form";
import { TakingCard } from "./card-face";
import { ScreenFrame } from "./frame";
import { KimarijiList } from "./kimariji-list";
import { usePracticeSession, type PracticePorts } from "./practice-session";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;

function statusText(view: CardFlowView): string {
  if (view.finished) {
    return C.finished;
  }
  const { judgement } = view;
  if (judgement === null) {
    return "";
  }
  if (judgement.kind === "correct") {
    return C.correct;
  }
  const reason = judgement.reason === null ? "" : C.reasons[judgement.reason];
  return [C.wrong(judgement.kimariji), reason].filter(Boolean).join("　");
}

function Practice(props: {
  readonly view: CardFlowView;
  readonly faces: CardFaceProvider;
  readonly dispatch: (command: CardFlowCommand) => void;
}): ReactNode {
  const { view } = props;
  return (
    <>
      <Progress {...view.progress} />
      <div className="practice">
        <div className="card-area">
          {view.card === null ? null : (
            <TakingCard
              faces={props.faces}
              poem={view.card.poem}
              orientation={view.card.orientation}
            />
          )}
        </div>
        <div className="controls">
          <AnswerForm view={view} turn={view.card} dispatch={props.dispatch} />
          <p role="status">{statusText(view)}</p>
        </div>
      </div>
    </>
  );
}

/** Spec 05: the card flow screen. */
export function CardFlowScreen(props: {
  readonly ports: PracticePorts;
  readonly onBackToTop: () => void;
}): ReactNode {
  const [round, setRound] = useState(0);
  const { session, view } = usePracticeSession(CARD_FLOW, cardFlowInput, {
    ...props.ports,
    round,
  });
  return (
    <ScreenFrame title={C.title} onBackToTop={props.onBackToTop}>
      {session === undefined || view === undefined ? null : (
        <>
          <Practice
            view={view}
            faces={props.ports.faces}
            dispatch={(command) => {
              session.dispatch(command);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setRound(round + 1);
            }}
          >
            {C.restart}
          </button>
          <KimarijiList list={view.list} />
        </>
      )}
    </ScreenFrame>
  );
}
