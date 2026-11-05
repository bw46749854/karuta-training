import {
  cardWidthFor,
  loadBoard,
  PLAY,
  playInput,
  type PlayView,
  type Random,
  type Settings,
} from "@karuta/application";
import type { Board } from "@karuta/domain";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BoardView } from "./board-view";
import { ScreenFrame } from "./frame";
import { PlayPanel } from "./play-panel";
import { usePracticeSession, type PracticePorts } from "./practice-session";
import { useElementSize, useLandscape } from "./screen-size";
import { WORDING } from "./wording";

const P = WORDING.placement;
const Y = WORDING.play;

// ADR-0007 §6: a card is pressed by touch, so it is at least 44 wide.
const MIN_CARD_WIDTH = 44;

/** The board, or the notice when its cards would be too small. */
function PlayBoard(props: {
  readonly view: PlayView;
  readonly faces: PracticePorts["faces"];
  readonly cardWidth: number;
  readonly onTake: (cell: number) => void;
}): ReactNode {
  const { view } = props;
  if (props.cardWidth < MIN_CARD_WIDTH) {
    return <p>{P.tooSmall}</p>;
  }
  return (
    <BoardView
      shape={view.shape}
      cells={view.cells}
      faces={props.faces}
      cardWidth={props.cardWidth}
      use={{ usable: view.actions.take, pressed: true, onCell: props.onTake }}
    />
  );
}

/**
 * The session lives here, so turning the screen upright and back keeps it
 * (spec 08 §2.6, ADR-0007 §5). The board keeps the saved shape; only the
 * size of the cards follows the screen.
 */
function PlayPractice(props: {
  readonly ports: PracticePorts;
  readonly board: Board;
  readonly onFinish: () => void;
}): ReactNode {
  const { ports, board } = props;
  const landscape = useLandscape();
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(area);
  const inputOf = useMemo(
    () => (settings: Settings, random: Random) =>
      playInput(settings, board, random),
    [board],
  );
  const { session, view } = usePracticeSession(PLAY, inputOf, {
    ...ports,
    round: 0,
  });
  if (!landscape) {
    return <p>{P.rotate}</p>;
  }
  const running = session !== undefined && view !== undefined;
  return (
    <div className="placement">
      <div className="board-area" ref={setArea}>
        {!running || size === undefined ? null : (
          <PlayBoard
            view={view}
            faces={ports.faces}
            cardWidth={cardWidthFor(board.shape, size)}
            onTake={(cell) => {
              session.dispatch({ kind: "take", cell });
            }}
          />
        )}
      </div>
      {running ? (
        <PlayPanel
          view={view}
          dispatch={(command) => {
            session.dispatch(command);
          }}
          onFinish={props.onFinish}
        />
      ) : (
        <div className="placement-panel" />
      )}
    </div>
  );
}

/** Spec 08: the play screen, opened from the placement memory. */
export function PlayScreen(props: {
  readonly ports: PracticePorts;
  readonly onOpenPlacement: () => void;
  readonly onFinish: () => void;
  readonly onBackToTop: () => void;
}): ReactNode {
  const { ports } = props;
  // Undefined while loading; null when no board is saved (spec 08 §2.4).
  const [board, setBoard] = useState<Board | null>();
  useEffect(() => {
    let open = true;
    void loadBoard(ports.boards).then((loaded) => {
      if (open) {
        setBoard(loaded ?? null);
      }
    });
    return () => {
      open = false;
    };
  }, [ports.boards]);
  return (
    <ScreenFrame title={Y.title} onBackToTop={props.onBackToTop}>
      {board === undefined ? null : board === null ? (
        <>
          <p>{Y.noBoard}</p>
          <button type="button" onClick={props.onOpenPlacement}>
            {Y.toPlacement}
          </button>
        </>
      ) : (
        <PlayPractice ports={ports} board={board} onFinish={props.onFinish} />
      )}
    </ScreenFrame>
  );
}
