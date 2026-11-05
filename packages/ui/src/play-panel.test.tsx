// @vitest-environment jsdom
import type { PlayJudgement, PlayView } from "@karuta/application";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { PlayPanel } from "./play-panel";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;
const Y = WORDING.play;

afterEach(cleanup);

function viewWith(overrides: Partial<PlayView>): PlayView {
  return {
    shape: { rows: 4, columns: 8 },
    cells: [],
    letters: "あさ",
    judgement: null,
    progress: { finished: 0, total: 3 },
    finished: false,
    actions: { take: true, skip: true, next: false },
    ...overrides,
  };
}

test("仕様 08 §5 §9 判定は、種類ごとの文言で出し、早い・遅いは秒数を小数第2位まで出す", () => {
  const cases: readonly (readonly [PlayJudgement, string])[] = [
    [{ kind: "correct" }, Y.correct],
    [{ kind: "dead" }, Y.dead],
    [{ kind: "wrong-card" }, Y.wrongCard],
    [{ kind: "missed" }, Y.missed],
    [{ kind: "early", seconds: 0.75 }, "早い：0.75 秒"],
    [{ kind: "late", seconds: 1.254 }, "遅い：1.25 秒"],
  ];
  for (const [judgement, words] of cases) {
    render(
      <PlayPanel
        view={viewWith({
          judgement,
          actions: { take: false, skip: false, next: true },
        })}
        dispatch={vi.fn()}
        onFinish={vi.fn()}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(words);
    cleanup();
  }
});

test("仕様 08 §4.6 §6 §7.3 読んでいる途中はスキップ、判定の後は次へ。全部読んだら知らせる", async () => {
  const dispatch = vi.fn();
  render(
    <PlayPanel view={viewWith({})} dispatch={dispatch} onFinish={vi.fn()} />,
  );
  expect(screen.getByText(Y.letters("あさ"))).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: C.skip }));
  expect(dispatch).toHaveBeenCalledWith({ kind: "skip" });
  cleanup();
  render(
    <PlayPanel
      view={viewWith({
        letters: "",
        finished: true,
        actions: { take: false, skip: false, next: false },
      })}
      dispatch={dispatch}
      onFinish={vi.fn()}
    />,
  );
  expect(screen.getByRole("status").textContent).toBe(Y.allRead);
  expect(screen.getByRole("button", { name: C.skip })).toHaveProperty(
    "disabled",
    true,
  );
});
