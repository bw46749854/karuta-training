import {
  boardShapeFor,
  cardWidthFor,
  loadBoard,
  PLACEMENT,
  placementInput,
  placementInputOn,
  placementQuestionsFor,
  saveBoard,
  type Area,
  type PlacementCommand,
  type PlacementInput,
  type PlacementView,
  type Random,
  type Session,
  type Settings,
} from "@karuta/application";
import type { Board, BoardShape } from "@karuta/domain";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BoardView } from "./board-view";
import { ScreenFrame } from "./frame";
import { PlacementPanel } from "./placement-panel";
import { usePracticeSession, type PracticePorts } from "./practice-session";
import { useElementSize, useLandscape } from "./screen-size";
import { WORDING } from "./wording";

const P = WORDING.placement;

/**
 * Spec 07 §2.3, §2.4: the board shape is chosen once, from the board's
 * area when the screen is first landscape, and kept for the session.
 */
function useBoardShape(
  landscape: boolean,
  size: Area | undefined,
): BoardShape | null | undefined {
  const [shape, setShape] = useState<BoardShape | null>();
  useEffect(() => {
    if (shape === undefined && landscape && size !== undefined) {
      setShape(boardShapeFor(size));
    }
  }, [shape, landscape, size]);
  return shape;
}

/**
 * Spec 08 §7.5: back from the play, the saved board. Undefined while it is
 * being read; null when not back from the play, or when there is none.
 */
function useResumedBoard(
  ports: PracticePorts,
  resume: boolean,
  onResumed: () => void,
): Board | null | undefined {
  const [board, setBoard] = useState<Board | null | undefined>(
    resume ? undefined : null,
  );
  useEffect(() => {
    if (board !== undefined) {
      return undefined;
    }
    let open = true;
    void loadBoard(ports.boards).then((loaded) => {
      if (open) {
        setBoard(loaded ?? null);
        onResumed();
      }
    });
    return () => {
      open = false;
    };
  }, [board, ports.boards, onResumed]);
  return board;
}

interface Running {
  readonly session: Session<PlacementCommand, PlacementView>;
  readonly view: PlacementView;
  readonly input: PlacementInput;
}

/** The board on the left, the panel on the right (spec 07 §3.2). */
function Layout(props: {
  readonly running: Running | undefined;
  readonly ports: PracticePorts;
  readonly shape: BoardShape;
  readonly size: Area | undefined;
  readonly area: (element: HTMLDivElement | null) => void;
  readonly onRedeal: () => void;
  readonly onPlay: (board: Board) => void;
  readonly playFailed: boolean;
}): ReactNode {
  const { running, ports, shape, size } = props;
  const dispatch = (command: PlacementCommand) => {
    running?.session.dispatch(command);
  };
  return (
    <div className="placement">
      <div className="board-area" ref={props.area}>
        {running === undefined || size === undefined ? null : (
          <BoardView
            shape={running.view.shape}
            cells={running.view.cells}
            faces={ports.faces}
            cardWidth={cardWidthFor(shape, size)}
            use={{
              usable: running.view.actions.flip || running.view.actions.select,
              pressed: running.view.actions.select,
              onCell: (cell) => {
                dispatch({ kind: "flip-cell", cell });
              },
            }}
          />
        )}
      </div>
      {running === undefined ? (
        // The same width as the panel, so the board's area does not change.
        <div className="placement-panel" />
      ) : (
        <Panel {...props} running={running} dispatch={dispatch} />
      )}
    </div>
  );
}

function Panel(props: {
  readonly running: Running;
  readonly ports: PracticePorts;
  readonly dispatch: (command: PlacementCommand) => void;
  readonly onRedeal: () => void;
  readonly onPlay: (board: Board) => void;
  readonly playFailed: boolean;
}): ReactNode {
  const { running, dispatch } = props;
  return (
    <PlacementPanel
      view={running.view}
      dispatch={dispatch}
      onStart={() => {
        dispatch({
          kind: "start",
          questions: placementQuestionsFor(running.input, props.ports.random),
        });
      }}
      onRedeal={props.onRedeal}
      onPlay={() => {
        props.onPlay(running.input.board);
      }}
      playFailed={props.playFailed}
    />
  );
}

/** Spec 08 §2.1: saves the board, then opens the play. */
function useSaveForPlay(
  ports: PracticePorts,
  onPlay: () => void,
): readonly [boolean, (board: Board) => void] {
  const [failed, setFailed] = useState(false);
  const play = (board: Board) => {
    void saveBoard(ports.boards, board).then((result) => {
      if (result === "saved") {
        onPlay();
      } else {
        setFailed(true);
      }
    });
  };
  return [failed, play];
}

/**
 * The session lives here, so turning the screen upright and back keeps it
 * (ADR-0007 §5): only the board and the panel give way to the notice.
 */
function Practice(props: {
  readonly ports: PracticePorts;
  readonly shape: BoardShape;
  /** The board back from the play, used for the first round only. */
  readonly resumed: Board | null;
  readonly landscape: boolean;
  readonly size: Area | undefined;
  readonly area: (element: HTMLDivElement | null) => void;
  readonly onPlay: () => void;
}): ReactNode {
  const { ports, shape, resumed } = props;
  const [round, setRound] = useState(0);
  const [playFailed, play] = useSaveForPlay(ports, props.onPlay);
  const inputOf = useMemo(
    () => (settings: Settings, random: Random) =>
      round === 0 && resumed !== null
        ? placementInputOn(settings, resumed)
        : placementInput(settings, shape, random),
    [shape, resumed, round],
  );
  const { session, view, input } = usePracticeSession(PLACEMENT, inputOf, {
    ...ports,
    round,
  });
  if (!props.landscape) {
    return <p>{P.rotate}</p>;
  }
  const running =
    session === undefined || view === undefined || input === undefined
      ? undefined
      : { session, view, input };
  return (
    <Layout
      running={running}
      ports={ports}
      shape={shape}
      size={props.size}
      area={props.area}
      onRedeal={() => {
        setRound(round + 1);
      }}
      onPlay={play}
      playFailed={playFailed}
    />
  );
}

/** Spec 07: the placement memory screen, landscape only (ADR-0007 §3). */
export function PlacementScreen(props: {
  readonly ports: PracticePorts;
  /** Spec 08 §7.5: opened again from the play, with the saved board. */
  readonly resume: boolean;
  readonly onResumed: () => void;
  readonly onPlay: () => void;
  readonly onBackToTop: () => void;
}): ReactNode {
  const landscape = useLandscape();
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(area);
  const resumed = useResumedBoard(props.ports, props.resume, props.onResumed);
  const measured = useBoardShape(landscape, size);
  const shape = resumed?.shape ?? measured;
  // The panel is there while measuring too, so the board's area is the
  // same as when the board is shown (spec 07 §2.3).
  const measuring = (
    <div className="placement">
      <div className="board-area" ref={setArea} />
      <div className="placement-panel" />
    </div>
  );
  if (resumed === undefined) {
    return (
      <ScreenFrame title={P.title} onBackToTop={props.onBackToTop}>
        {null}
      </ScreenFrame>
    );
  }
  return (
    <ScreenFrame title={P.title} onBackToTop={props.onBackToTop}>
      {shape === null ? (
        <p>{P.tooSmall}</p>
      ) : shape === undefined ? (
        landscape ? (
          measuring
        ) : (
          <p>{P.rotate}</p>
        )
      ) : (
        <Practice
          ports={props.ports}
          shape={shape}
          resumed={resumed}
          landscape={landscape}
          size={size}
          area={setArea}
          onPlay={props.onPlay}
        />
      )}
    </ScreenFrame>
  );
}
