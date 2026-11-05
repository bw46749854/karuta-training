import {
  LAYOUT_SHAPES,
  layoutFor,
  type LayoutsByShape,
} from "@karuta/application";
import type { BoardShape } from "@karuta/domain";
import { useState, type ReactNode } from "react";
import { WORDING } from "./wording";

const S = WORDING.settings;

const keyOf = (shape: BoardShape) =>
  `${String(shape.rows)}x${String(shape.columns)}`;

function Side(props: {
  readonly label: string;
  readonly shape: BoardShape;
  readonly cells: readonly { readonly index: number; readonly used: boolean }[];
  readonly onToggle: (index: number) => void;
}): ReactNode {
  const { shape } = props;
  return (
    <div
      role="group"
      aria-label={props.label}
      className="layout-side"
      style={{ gridTemplateColumns: `repeat(${String(shape.columns)}, 44px)` }}
    >
      {props.cells.map(({ index, used }) => (
        <input
          key={index}
          type="checkbox"
          className="layout-cell"
          aria-label={S.cell(
            Math.floor(index / shape.columns) + 1,
            (index % shape.columns) + 1,
          )}
          checked={used}
          onChange={() => {
            props.onToggle(index);
          }}
        />
      ))}
    </div>
  );
}

function ShapeSelect(props: {
  readonly shape: BoardShape;
  readonly onChange: (shape: BoardShape | undefined) => void;
}): ReactNode {
  return (
    <div className="setting-row">
      <label htmlFor="layout-shape">{S.shape}</label>
      <select
        id="layout-shape"
        value={keyOf(props.shape)}
        onChange={(event) => {
          const key = event.currentTarget.value;
          props.onChange(LAYOUT_SHAPES.find((other) => keyOf(other) === key));
        }}
      >
        {LAYOUT_SHAPES.map((other) => (
          <option key={keyOf(other)} value={keyOf(other)}>
            {S.shapeName(other.rows, other.columns)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Spec 04 §8: the used cells of each board shape. */
export function LayoutEditor(props: {
  readonly layouts: LayoutsByShape;
  readonly onToggle: (shape: BoardShape, index: number) => void;
}): ReactNode {
  // Spec 04 §8.2: 6 rows by 11 columns first (waiting for a decision).
  const [shape, setShape] = useState<BoardShape | undefined>(LAYOUT_SHAPES[0]);
  if (shape === undefined) {
    return null;
  }
  const cells = layoutFor(props.layouts, shape).used.map((used, index) => ({
    index,
    used,
  }));
  const half = cells.length / 2;
  const toggle = (index: number) => {
    props.onToggle(shape, index);
  };
  return (
    <>
      <ShapeSelect shape={shape} onChange={setShape} />
      <div className="layout-board">
        <Side
          label={S.opponentSide}
          shape={shape}
          cells={cells.slice(0, half)}
          onToggle={toggle}
        />
        <Side
          label={S.ownSide}
          shape={shape}
          cells={cells.slice(half)}
          onToggle={toggle}
        />
      </div>
    </>
  );
}
