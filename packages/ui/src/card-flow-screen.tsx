import {
  CARD_FLOW,
  cardFlowInput,
  loadSettings,
  runSession,
  type CardFaceProvider,
  type CardFlowCommand,
  type CardFlowView,
  type Clock,
  type Random,
  type Scheduler,
  type Session,
  type Settings,
  type SettingsRepository,
} from "@karuta/application";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { TakingCard } from "./card-face";
import { ScreenFrame } from "./frame";
import { KimarijiList } from "./kimariji-list";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;

type Dispatch = (command: CardFlowCommand) => void;

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

function Answering(props: {
  readonly view: CardFlowView;
  readonly dispatch: Dispatch;
}): ReactNode {
  const { view, dispatch } = props;
  const input = useRef<HTMLInputElement>(null);
  const move = useRef<HTMLButtonElement>(null);
  // Keyboard and controller: the next thing to do gets the focus.
  useEffect(() => {
    (view.actions.next ? move : input).current?.focus();
  }, [view.actions.next, view.card]);
  return (
    <form
      className="answer-form"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ kind: "answer" });
      }}
    >
      <label htmlFor="card-flow-input">{C.input}</label>
      <input
        id="card-flow-input"
        ref={input}
        type="text"
        autoComplete="off"
        value={view.input}
        readOnly={view.inputLocked}
        disabled={view.finished}
        onChange={(event) => {
          dispatch({ kind: "input", text: event.currentTarget.value });
        }}
      />
      <button type="submit" disabled={!view.actions.answer}>
        {C.answer}
      </button>
      {view.actions.skip || view.actions.next ? (
        <button
          type="button"
          ref={move}
          onClick={() => {
            dispatch({ kind: view.actions.next ? "next" : "skip" });
          }}
        >
          {view.actions.next ? C.next : C.skip}
        </button>
      ) : null}
    </form>
  );
}

function Practice(props: {
  readonly view: CardFlowView;
  readonly faces: CardFaceProvider;
  readonly dispatch: Dispatch;
}): ReactNode {
  const { view } = props;
  const { finished, total } = view.progress;
  return (
    <>
      <div className="progress">
        <p>{C.progressText(finished, total)}</p>
        <progress max={total} value={finished} aria-label={C.progress} />
      </div>
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
          <Answering view={view} dispatch={props.dispatch} />
          <p role="status">{statusText(view)}</p>
        </div>
      </div>
    </>
  );
}

/** The ports the card flow screen uses, chosen by the composition root. */
export interface CardFlowPorts {
  readonly settings: SettingsRepository;
  readonly random: Random;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly faces: CardFaceProvider;
}

function useSession(ports: CardFlowPorts, round: number) {
  const [settings, setSettings] = useState<Settings>();
  const [session, setSession] =
    useState<Session<CardFlowCommand, CardFlowView>>();
  const [view, setView] = useState<CardFlowView>();
  useEffect(() => {
    let open = true;
    void loadSettings(ports.settings).then((loaded) => {
      if (open) {
        setSettings(loaded);
      }
    });
    return () => {
      open = false;
    };
  }, [ports.settings]);
  useEffect(() => {
    if (settings === undefined) {
      return undefined;
    }
    // Spec 05 §7: each round starts from new questions (ADR-0004 §6).
    const next = runSession(
      CARD_FLOW,
      cardFlowInput(settings, ports.random),
      ports,
    );
    setSession(next);
    setView(next.view());
    const unsubscribe = next.subscribe(setView);
    return () => {
      unsubscribe();
      next.dispose();
    };
  }, [settings, ports, round]);
  return { session, view };
}

/** Spec 05: the card flow screen. */
export function CardFlowScreen(props: {
  readonly ports: CardFlowPorts;
  readonly onBackToTop: () => void;
}): ReactNode {
  const [round, setRound] = useState(0);
  const { session, view } = useSession(props.ports, round);
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
