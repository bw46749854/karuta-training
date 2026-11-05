import {
  MULTIPLE_CARD_FLOW,
  multipleCardFlowInput,
  type CardFaceProvider,
  type MultipleCardFlowCommand,
  type MultipleCardFlowView,
} from "@karuta/application";
import { useState, type ReactNode } from "react";
import { AnswerForm, Progress } from "./answer-form";
import { TakingCard } from "./card-face";
import { ScreenFrame } from "./frame";
import { KimarijiList } from "./kimariji-list";
import { usePracticeSession, type PracticePorts } from "./practice-session";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;
const M = WORDING.multiple;

// Spec 06 §3.3: where each place sits in the 3 by 2 frame, as [row, column].
const PLACES: Readonly<Record<number, readonly [number, number]>> = {
  1: [2, 3],
  2: [2, 2],
  3: [1, 3],
  4: [1, 2],
  5: [2, 1],
  6: [1, 1],
};

function statusText(view: MultipleCardFlowView): string {
  if (view.finished) {
    return C.finished;
  }
  if (view.notice !== null) {
    return M.notices[view.notice];
  }
  if (view.judgement === null) {
    return "";
  }
  return view.judgement.correct ? C.correct : M.wrong;
}

/** Spec 06 §3.3: the cards in their places; upside down turns the frame. */
function CardFrame(props: {
  readonly view: MultipleCardFlowView;
  readonly faces: CardFaceProvider;
}): ReactNode {
  const { view } = props;
  return (
    <div className={`card-frame ${view.orientation ?? ""}`}>
      {view.cards.map((card) => {
        const [row, column] = PLACES[card.position] ?? [1, 1];
        return (
          <div
            key={card.position}
            className="card-place"
            style={{ gridRow: row, gridColumn: column }}
          >
            {card.hidden ? (
              <div
                role="img"
                aria-label={M.hiddenCard(card.position)}
                className="taking-card blank"
              />
            ) : (
              <TakingCard
                faces={props.faces}
                poem={card.poem}
                orientation="upright"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Practice(props: {
  readonly view: MultipleCardFlowView;
  readonly faces: CardFaceProvider;
  readonly dispatch: (command: MultipleCardFlowCommand) => void;
}): ReactNode {
  const { view } = props;
  return (
    <>
      <Progress {...view.progress} />
      <div className="practice">
        <CardFrame view={view} faces={props.faces} />
        <div className="controls">
          <AnswerForm
            view={view}
            turn={view.cards[0]?.poem}
            dispatch={props.dispatch}
          />
          <p role="status">{statusText(view)}</p>
        </div>
      </div>
    </>
  );
}

/** Spec 06: the multiple card flow screen. */
export function MultipleCardFlowScreen(props: {
  readonly ports: PracticePorts;
  readonly onBackToTop: () => void;
}): ReactNode {
  const [round, setRound] = useState(0);
  const { session, view } = usePracticeSession(
    MULTIPLE_CARD_FLOW,
    multipleCardFlowInput,
    { ...props.ports, round },
  );
  return (
    <ScreenFrame title={M.title} onBackToTop={props.onBackToTop}>
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
