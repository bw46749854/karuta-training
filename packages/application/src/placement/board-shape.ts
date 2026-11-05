import { boardShape, type BoardShape } from "@karuta/domain";

// ADR-0007 §1, §2: the rows and columns are chosen first, as many as fit
// with a card at least 44 wide; then the card is made as large as fits.
// Cards keep the ratio of a taking card, 53 by 73. The space between cards
// is 4, and between the two sides 12.

const MIN_CARD_WIDTH = 44;
const GAP = 4;
const SIDE_GAP = 12;
const RATIO = 53 / 73;

/** The size of the board's area on the screen. */
export interface Area {
  readonly width: number;
  readonly height: number;
}

function widthFits(columns: number, width: number): boolean {
  return columns * MIN_CARD_WIDTH + (columns - 1) * GAP <= width;
}

function heightNeeded(rows: number, cardWidth: number): number {
  return (rows * cardWidth) / RATIO + (rows - 2) * GAP + SIDE_GAP;
}

/**
 * The board shape for the area: 6 or 4 rows by its height, 11 to 8 columns
 * by its width. Null when even 4 rows by 8 columns do not fit (ADR-0007 §8).
 */
export function boardShapeFor(area: Area): BoardShape | null {
  const rows = [6, 4].find(
    (count) => heightNeeded(count, MIN_CARD_WIDTH) <= area.height,
  );
  const columns = [11, 10, 9, 8].find((count) => widthFits(count, area.width));
  return rows === undefined || columns === undefined
    ? null
    : boardShape(rows, columns);
}

/** The width of each card, as large as fits the area in both directions. */
export function cardWidthFor(shape: BoardShape, area: Area): number {
  const byWidth = (area.width - (shape.columns - 1) * GAP) / shape.columns;
  const byHeight =
    ((area.height - (shape.rows - 2) * GAP - SIDE_GAP) / shape.rows) * RATIO;
  return Math.min(byWidth, byHeight);
}
