import {
  boardShapeFor,
  cardWidthFor,
  PLACEMENT,
  placementInput,
  placementQuestionsFor,
  type Area,
  type PlacementCommand,
  type PlacementInput,
  type PlacementView,
  type Random,
  type Session,
  type Settings,
} from "@karuta/application";
import type { BoardShape } from "@karuta/domain";
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
            view={running.view}
            faces={ports.faces}
            cardWidth={cardWidthFor(shape, size)}
            dispatch={dispatch}
          />
        )}
      </div>
      {running === undefined ? null : (
        <PlacementPanel
          view={running.view}
          dispatch={dispatch}
          onStart={() => {
            dispatch({
              kind: "start",
              questions: placementQuestionsFor(running.input, ports.random),
            });
          }}
          onRedeal={props.onRedeal}
        />
      )}
    </div>
  );
}

/**
 * The session lives here, so turning the screen upright and back keeps it
 * (ADR-0007 §5): only the board and the panel give way to the notice.
 */
function Practice(props: {
  readonly ports: PracticePorts;
  readonly shape: BoardShape;
  readonly landscape: boolean;
  readonly size: Area | undefined;
  readonly area: (element: HTMLDivElement | null) => void;
}): ReactNode {
  const { ports, shape } = props;
  const [round, setRound] = useState(0);
  const inputOf = useMemo(
    () => (settings: Settings, random: Random) =>
      placementInput(settings, shape, random),
    [shape],
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
    />
  );
}

/** Spec 07: the placement memory screen, landscape only (ADR-0007 §3). */
export function PlacementScreen(props: {
  readonly ports: PracticePorts;
  readonly onBackToTop: () => void;
}): ReactNode {
  const landscape = useLandscape();
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(area);
  const shape = useBoardShape(landscape, size);
  const measuring = (
    <div className="placement">
      <div className="board-area" ref={setArea} />
    </div>
  );
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
          landscape={landscape}
          size={size}
          area={setArea}
        />
      )}
    </ScreenFrame>
  );
}
