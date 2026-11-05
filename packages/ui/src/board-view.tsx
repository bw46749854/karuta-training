import type { CardFaceProvider } from "@karuta/application";
import type { BoardShape, PoemId } from "@karuta/domain";
import type { ReactNode } from "react";
import { TakingCard } from "./card-face";
import { WORDING } from "./wording";

const P = WORDING.placement;

// ADR-0007 §1: cards keep the ratio of a taking card, 53 by 73.
const HEIGHT_PER_WIDTH = 73 / 53;

/** One cell of the board, as the placement memory and the play show it. */
export interface BoardCell {
  readonly index: number;
  readonly row: number;
  readonly column: number;
  readonly side: "opponent" | "own";
  readonly poem: PoemId | null;
  readonly faceUp: boolean;
  readonly selected: boolean;
}

/** What the board does when a card is pressed (spec 07 §4, §5; spec 08 §4). */
export interface BoardUse {
  /** Whether the cards can be pressed now. */
  readonly usable: boolean;
  /** Whether pressed shows which cells are chosen or taken. */
  readonly pressed: boolean;
  readonly onCell: (index: number) => void;
}

function cellName(cell: BoardCell & { readonly poem: PoemId }): string {
  return cell.faceUp
    ? P.cardCell(cell.row, cell.column, cell.poem)
    : P.hiddenCell(cell.row, cell.column);
}

/** One cell: nothing, or a card that can be pressed. */
function Cell(props: {
  readonly cell: BoardCell;
  readonly faces: CardFaceProvider;
  readonly use: BoardUse;
}): ReactNode {
  const { cell, use } = props;
  const { poem } = cell;
  if (poem === null) {
    return <div className="board-cell" />;
  }
  return (
    <button
      type="button"
      className={`board-cell${cell.selected ? " selected" : ""}`}
      aria-label={cellName({ ...cell, poem })}
      aria-pressed={use.pressed ? cell.selected : undefined}
      disabled={!use.usable}
      onClick={() => {
        use.onCell(cell.index);
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
  readonly shape: BoardShape;
  readonly cells: readonly BoardCell[];
  readonly faces: CardFaceProvider;
  readonly cardWidth: number;
  readonly use: BoardUse;
}): ReactNode {
  const { cardWidth } = props;
  const height = cardWidth * HEIGHT_PER_WIDTH;
  return (
    <div className="board" role="group" aria-label={P.board}>
      {(["opponent", "own"] as const).map((side) => (
        <div
          key={side}
          className="board-side"
          style={{
            gridTemplateColumns: `repeat(${String(props.shape.columns)}, ${String(cardWidth)}px)`,
            gridAutoRows: `${String(height)}px`,
            fontSize: `${String(cardWidth * 0.3)}px`,
          }}
        >
          {props.cells
            .filter((cell) => cell.side === side)
            .map((cell) => (
              <Cell
                key={cell.index}
                cell={cell}
                faces={props.faces}
                use={props.use}
              />
            ))}
        </div>
      ))}
    </div>
  );
}
