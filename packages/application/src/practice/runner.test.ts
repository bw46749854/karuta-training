import { expect, test } from "vitest";
import { FakeTime } from "../test-support/fake-time";
import type { Message, PracticeMode, Step } from "./contract";
import { runSession } from "./runner";

// A small mode for testing the runner. It counts commands, can ask for a
// tick after 100 or 300 ms, and records when each message arrived. Its view
// is its whole state.
interface State {
  readonly count: number;
  readonly ticks: number;
  readonly arrivals: readonly number[];
}
type Command = "count" | "wait" | "waitLonger" | "stop";
type TimerEvent = "tick";

function onCommand(state: State, command: Command): Step<State, TimerEvent> {
  switch (command) {
    case "count":
      return { state: { ...state, count: state.count + 1 }, effects: [] };
    case "wait":
      return {
        state,
        effects: [{ kind: "schedule", key: "t", afterMs: 100, event: "tick" }],
      };
    case "waitLonger":
      return {
        state,
        effects: [{ kind: "schedule", key: "t", afterMs: 300, event: "tick" }],
      };
    case "stop":
      return { state, effects: [{ kind: "cancel", key: "t" }] };
  }
}

const mode: PracticeMode<number, State, Command, TimerEvent, State> = {
  start: (count, at) => ({
    state: { count, ticks: 0, arrivals: [at] },
    effects: [],
  }),
  update: (state, message: Message<Command, TimerEvent>) => {
    const arrived = { ...state, arrivals: [...state.arrivals, message.at] };
    if (message.kind === "timer") {
      return { state: { ...arrived, ticks: state.ticks + 1 }, effects: [] };
    }
    return onCommand(arrived, message.command);
  },
  view: (state) => state,
};

function start(count = 0) {
  const time = new FakeTime();
  time.advance(5);
  const session = runSession(mode, count, { clock: time, scheduler: time });
  return { time, session };
}

test("ADR-0004 §4 始めると、その時刻を付けて、モードの最初の状態から表示を作る", () => {
  expect(start(3).session.view()).toEqual({
    count: 3,
    ticks: 0,
    arrivals: [5],
  });
});

test("ADR-0004 §3 コマンドは、そのときの時刻を付けてモードに届く", () => {
  const { time, session } = start();
  time.advance(20);
  session.dispatch("count");
  expect(session.view()).toEqual({ count: 1, ticks: 0, arrivals: [5, 25] });
});

test("ADR-0004 §3 予約した出来事は、その時間が経つと、そのときの時刻を付けて届く", () => {
  const { time, session } = start();
  session.dispatch("wait");
  time.advance(99);
  expect(session.view().ticks).toBe(0);
  time.advance(1);
  expect(session.view()).toEqual({ count: 0, ticks: 1, arrivals: [5, 5, 105] });
});

test("ADR-0004 §3 取り消した予約は、届かない", () => {
  const { time, session } = start();
  session.dispatch("wait");
  session.dispatch("stop");
  time.advance(1000);
  expect(session.view().ticks).toBe(0);
  expect(time.pending).toBe(0);
});

test("ADR-0004 §3 同じ名前で予約し直すと、前の予約は取り消される", () => {
  const { time, session } = start();
  session.dispatch("wait");
  session.dispatch("waitLonger");
  time.advance(200);
  expect(session.view().ticks).toBe(0);
  time.advance(100);
  expect(session.view().ticks).toBe(1);
  time.advance(1000);
  expect(session.view().ticks).toBe(1);
  expect(time.pending).toBe(0);
});

test("ADR-0004 §7 表示が変わるたびに、見ている側に知らせる", () => {
  const { time, session } = start();
  const counts: string[] = [];
  session.subscribe((view) =>
    counts.push(`${String(view.count)}/${String(view.ticks)}`),
  );
  session.dispatch("wait");
  time.advance(100);
  session.dispatch("count");
  expect(counts).toEqual(["0/0", "0/1", "1/1"]);
});

test("ADR-0004 §3 画面を離れると、予約はすべて取り消され、その後の操作は何もしない", () => {
  const { time, session } = start();
  const views: State[] = [];
  session.subscribe((view) => views.push(view));
  session.dispatch("wait");
  session.dispose();
  expect(time.pending).toBe(0);
  session.dispatch("count");
  time.advance(1000);
  expect(session.view()).toEqual({ count: 0, ticks: 0, arrivals: [5, 5] });
  expect(views).toHaveLength(1);
});

test("ADR-0004 §7 見るのをやめた後は、表示の変化を知らせない", () => {
  const { session } = start();
  const views: State[] = [];
  const stop = session.subscribe((view) => views.push(view));
  session.dispatch("count");
  stop();
  session.dispatch("count");
  expect(views).toHaveLength(1);
});
