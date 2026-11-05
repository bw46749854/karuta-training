// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ScreenFrame } from "./frame";
import { WORDING } from "./wording";

afterEach(cleanup);

test("取扱説明書 §7.1 画面の見出しと、トップへ戻るボタンを出す", async () => {
  const onBackToTop = vi.fn();
  render(
    <ScreenFrame title="設定" onBackToTop={onBackToTop}>
      <p>中身</p>
    </ScreenFrame>,
  );
  expect(screen.getByRole("heading", { level: 1, name: "設定" })).toBeTruthy();
  expect(screen.getByRole("main").textContent).toBe("中身");
  await userEvent.click(
    screen.getByRole("button", { name: WORDING.common.backToTop }),
  );
  expect(onBackToTop).toHaveBeenCalledTimes(1);
});

test("取扱説明書 §7.1 トップ画面には、トップへ戻るボタンを出さない", () => {
  render(<ScreenFrame title="トップ">中身</ScreenFrame>);
  expect(
    screen.queryByRole("button", { name: WORDING.common.backToTop }),
  ).toBeNull();
});
