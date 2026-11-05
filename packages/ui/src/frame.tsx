import type { ReactNode } from "react";
import { WORDING } from "./wording";

/**
 * The frame every screen shares: its heading, and the button back to the
 * top screen on every screen but the top (manual §7.1, §8.1).
 */
export function ScreenFrame(props: {
  readonly title: string;
  readonly onBackToTop?: () => void;
  readonly children: ReactNode;
}): ReactNode {
  const { title, onBackToTop, children } = props;
  return (
    <>
      <header className="screen-header">
        <h1>{title}</h1>
        {onBackToTop === undefined ? null : (
          <button type="button" onClick={onBackToTop}>
            {WORDING.common.backToTop}
          </button>
        )}
      </header>
      <main>{children}</main>
    </>
  );
}
