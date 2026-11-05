import type { Area } from "@karuta/application";
import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  addEventListener("resize", onChange);
  return () => {
    removeEventListener("resize", onChange);
  };
}

// A string, so that the same size gives the same snapshot.
const snapshot = () => `${String(innerWidth)}x${String(innerHeight)}`;

/** ADR-0007 §3: landscape is when the screen is at least as wide as tall. */
export function useLandscape(): boolean {
  const [width = 0, height = 0] = useSyncExternalStore(subscribe, snapshot)
    .split("x")
    .map(Number);
  return width >= height;
}

/** The size of an element, measured again whenever it changes. */
export function useElementSize(element: HTMLElement | null): Area | undefined {
  const [size, setSize] = useState<Area>();
  useEffect(() => {
    if (element === null) {
      return undefined;
    }
    const measure = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);
  return size;
}
