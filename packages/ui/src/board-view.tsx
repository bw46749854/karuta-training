import type {
  CardFaceProvider,
  PlacementCommand,
  PlacementView,
} from "@karuta/application";
import type { ReactNode } from "react";
import { TakingCard } from "./card-face";
import { WORDING } from "./wording";

const P = WORDING.placement;

// ADR-0007 §1: cards keep the ratio of a taking card, 53 by 73.
const HEIGHT_PER_WIDTH = 73 / 53;

type Cell = PlacementView["cells"][number];

function cellName(cell: Cell & { readonly poem: number }): string {
  return cell.faceUp
    ? P.cardCell(cell.row, cell.column, cell.poem)
    : P.hiddenCell(cell.row, cell.column);
}

/** One cell: nothing, or a card that can be turned over or chosen. */
function BoardCell(props: {
  readonly cell: Cell;
  readonly view: PlacementView;
  readonly faces: CardFaceProvider;
  readonly dispatch: (command: PlacementCommand) => void;
}): ReactNode {
  const { cell, view } = props;
  const { poem } = cell;
  if (poem === null) {
    return <div className="board-cell" />;
  }
  const { flip, select } = view.actions;
  return (
    <button
      type="button"
      className={`board-cell${cell.selected ? " selected" : ""}`}
      aria-label={cellName({ ...cell, poem })}
      aria-pressed={select ? cell.selected : undefined}
      disabled={!flip && !select}
      onClick={() => {
        props.dispatch({ kind: "flip-cell", cell: cell.index });
      }}
    >
      {cell.faceUp ? (
        <TakingCard
          faces={props.faces}
          poem={poem}
          orientation={cell.side === "opponent" ? "upside-down" : "upright"}
        />
      ) : (
        <div className="card-back" />
      )}
    </button>
  );
}

/** Spec 07 §3.3: the opponent's side above the player's, a gap between. */
export function BoardView(props: {
  readonly view: PlacementView;
  readonly faces: CardFaceProvider;
  readonly cardWidth: number;
  readonly dispatch: (command: PlacementCommand) => void;
}): ReactNode {
  const { view, cardWidth } = props;
  const size = { width: cardWidth, height: cardWidth * HEIGHT_PER_WIDTH };
  return (
    <div className="board" role="group" aria-label={P.board}>
      {(["opponent", "own"] as const).map((side) => (
        <div
          key={side}
          className="board-side"
          style={{
            gridTemplateColumns: `repeat(${String(view.shape.columns)}, ${String(size.width)}px)`,
            gridAutoRows: `${String(size.height)}px`,
            fontSize: `${String(cardWidth * 0.3)}px`,
          }}
        >
          {view.cells
            .filter((cell) => cell.side === side)
            .map((cell) => (
              <BoardCell
                key={cell.index}
                cell={cell}
                view={view}
                faces={props.faces}
                dispatch={props.dispatch}
              />
            ))}
        </div>
      ))}
    </div>
  );
}
