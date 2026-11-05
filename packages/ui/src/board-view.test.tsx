// @vitest-environment jsdom
import {
  DEFAULT_SETTINGS,
  PLACEMENT,
  placementInput,
  placementQuestionsFor,
  type CardFaceProvider,
  type PlacementCommand,
  type PlacementView,
} from "@karuta/application";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { BoardView } from "./board-view";
import { WORDING } from "./wording";

const P = WORDING.placement;

afterEach(cleanup);

const faces: CardFaceProvider = {
  face: (poem) => Promise.resolve({ kind: "text", text: String(poem) }),
};

// 4 rows by 8 columns, every poem a target, questions one poem at a time.
// A wrong answer does not allow checking (the default is when correct).
const INPUT = placementInput(
  {
    ...DEFAULT_SETTINGS,
    placement: { ...DEFAULT_SETTINGS.placement, mode: "individual" },
  },
  { rows: 4, columns: 8 },
  () => 0,
);

const START: PlacementCommand = {
  kind: "start",
  questions: placementQuestionsFor(INPUT, () => 0),
};

function viewAfter(commands: readonly PlacementCommand[]): PlacementView {
  const state = commands.reduce(
    (current, command) =>
      PLACEMENT.update(current, { kind: "command", command, at: 0 }).state,
    PLACEMENT.start(INPUT, 0).state,
  );
  return PLACEMENT.view(state);
}

function renderBoard(view: PlacementView): PlacementCommand[] {
  const sent: PlacementCommand[] = [];
  render(
    <BoardView
      shape={view.shape}
      cells={view.cells}
      faces={faces}
      cardWidth={44}
      use={{
        usable: view.actions.flip || view.actions.select,
        pressed: view.actions.select,
        onCell: (cell) => sent.push({ kind: "flip-cell", cell }),
      }}
    />,
  );
  return sent;
}

const CARDS = viewAfter([]).cells.filter((cell) => cell.poem !== null);
const FIRST = CARDS[0];

test("仕様 07 §3.3 §8 札のあるマスだけが、段と列と札で名付けたボタンになる", () => {
  renderBoard(viewAfter([]));
  const board = screen.getByRole("group", { name: P.board });
  expect(within(board).getAllByRole("button")).toHaveLength(CARDS.length);
  expect(
    within(board).getByRole("button", {
      name: P.cardCell(FIRST?.row ?? 0, FIRST?.column ?? 0, FIRST?.poem ?? 0),
    }),
  ).toBeTruthy();
});

test("仕様 07 §4 覚える時間に札を押すと、そのマスを裏返す操作を送る", async () => {
  const sent = renderBoard(viewAfter([]));
  const [button] = screen.getAllByRole("button");
  expect(button?.getAttribute("aria-pressed")).toBeNull();
  if (button !== undefined) {
    await userEvent.click(button);
  }
  expect(sent).toEqual([{ kind: "flip-cell", cell: FIRST?.index }]);
});

test("仕様 07 §5.4 出題中は伏せた札として名付け、選んだマスは押された状態になる", () => {
  const cell = FIRST?.index ?? 0;
  renderBoard(viewAfter([START, { kind: "flip-cell", cell }]));
  const pressed = screen.getAllByRole("button", { pressed: true });
  expect(pressed.map((button) => button.getAttribute("aria-label"))).toEqual([
    P.hiddenCell(FIRST?.row ?? 0, FIRST?.column ?? 0),
  ]);
  expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(
    CARDS.length - 1,
  );
});

test("仕様 07 §5.6 判定の後で確認を許可しないときは、札を押せない", () => {
  renderBoard(viewAfter([START, { kind: "answer" }]));
  for (const button of screen.getAllByRole("button")) {
    expect(button).toHaveProperty("disabled", true);
  }
});
