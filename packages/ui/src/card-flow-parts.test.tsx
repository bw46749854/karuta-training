// @vitest-environment jsdom
import {
  DEFAULT_SETTINGS,
  poemSelection,
  type CardFaceProvider,
  type KimarijiRow,
} from "@karuta/application";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { TakingCard } from "./card-face";
import { KimarijiList } from "./kimariji-list";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;

afterEach(cleanup);

// む (87) and す (18), the first two of the kimariji table.
const [MU, SU] = poemSelection(DEFAULT_SETTINGS).poems;

const ROWS: KimarijiRow[] = [MU, SU].flatMap((poem, index) =>
  poem === undefined
    ? []
    : [
        {
          poem: poem.id,
          kimariji: poem.kimariji,
          status: index === 0 ? "correct" : "unread",
          changed: index === 0,
        },
      ],
);

test("仕様 05 §8.1 §8.3 §8.5 一覧は初めは閉じていて、開くと決まり字順で状態を出し、出題順に切り替わる", async () => {
  render(<KimarijiList list={{ kimariji: ROWS, asked: ROWS.slice(0, 1) }} />);
  expect(screen.queryByRole("region", { name: C.list })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: C.openList }));
  const region = screen.getByRole("region", { name: C.list });
  const items = () =>
    within(region)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
  expect(items()).toEqual([
    `${C.row(87, "む")} ${C.status("correct", true, true)}`,
    `${C.row(18, "す")} ${C.status("unread", false, false)}`,
  ]);
  await userEvent.click(
    within(region).getByRole("button", { name: C.byAsked }),
  );
  expect(items()).toHaveLength(1);
  await userEvent.click(
    within(region).getByRole("button", { name: C.byKimariji }),
  );
  expect(items()).toHaveLength(2);
  await userEvent.click(screen.getByRole("button", { name: C.closeList }));
  expect(screen.queryByRole("region", { name: C.list })).toBeNull();
});

// Whether an upside-down card looks turned is checked in the browser, by
// its computed style (the card flow's acceptance tests), not by its class.
test("仕様 05 §3.3 札は、出す札の札面だけを読み込んで出す", async () => {
  const asked: number[] = [];
  const faces: CardFaceProvider = {
    face: (poem) => {
      asked.push(poem);
      return Promise.resolve({ kind: "text", text: `face ${String(poem)}` });
    },
  };
  if (MU === undefined) {
    throw new Error("No poems");
  }
  render(<TakingCard faces={faces} poem={MU.id} orientation="upside-down" />);
  const card = screen.getByRole("img", { name: C.card(87) });
  expect(await within(card).findByText("face 87")).toBeTruthy();
  expect(asked).toEqual([87]);
});
