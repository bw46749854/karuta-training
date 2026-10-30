import type { BrowserContext, Page } from '@playwright/test';

/** DEMO=1: run in a visible window with captions so a person can watch the reproduction. */
export const DEMO = !!process.env.DEMO;

type Box = { x: number; y: number; width: number; height: number };

/**
 * Prepares a fresh browser context for the sample:
 * saves the given settings to localStorage once per tab and fixes Math.random,
 * so card deals and question order repeat on every run.
 */
export async function prepare(context: BrowserContext, { settings, seed }: { settings: object; seed: number }): Promise<void> {
  await context.addInitScript((s) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.clear();
    localStorage.setItem('karutaSettings.v1', JSON.stringify(s));
  }, settings);
  await context.addInitScript((seed) => {
    let x = seed >>> 0;
    Math.random = () => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 4294967296;
    };
  }, seed);
  if (DEMO) await context.addInitScript(installOverlay);
}

/** Shows a caption at the top of the window (DEMO only) and holds it for `holdMs`. */
export async function narrate(page: Page, main: string, sub = '', holdMs = 0): Promise<void> {
  if (!DEMO) return;
  await page.evaluate(([m, s]) => window.__demo?.caption(m, s), [main, sub] as const);
  if (holdMs) await page.waitForTimeout(holdMs);
}

/** Clicks an element; in DEMO the click position is marked first. */
export async function click(page: Page, selector: string): Promise<void> {
  if (DEMO) {
    const r = await page.locator(selector).boundingBox();
    if (r) await page.evaluate(([x, y]) => window.__demo?.mark(x, y), [r.x + r.width / 2, r.y + r.height / 2] as const);
    await page.waitForTimeout(700);
  }
  await page.click(selector, { force: true });
}

/** Draws a labelled frame around a screen area (DEMO only). */
export async function frame(page: Page, box: Box | null, color: string, label: string): Promise<void> {
  if (!DEMO || !box) return;
  await page.evaluate(([b, c, l]) => window.__demo?.box(b, c, l), [box, color, label] as const);
}

declare global {
  interface Window {
    __demo?: { caption(main: string, sub: string): void; mark(x: number, y: number): void; box(r: Box, color: string, label: string): void };
  }
}

// Runs inside the page: caption banner, click marker and frames on a layer above the app.
function installOverlay(): void {
  const layer = (): HTMLElement => {
    let el = document.getElementById('__demo');
    if (!el) {
      el = document.createElement('div');
      el.id = '__demo';
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:sans-serif';
      document.body.appendChild(el);
    }
    return el;
  };
  window.__demo = {
    caption(main, sub) {
      let c = document.getElementById('__cap');
      if (!c) {
        c = document.createElement('div');
        c.id = '__cap';
        c.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);max-width:92vw;background:rgba(15,15,25,.92);color:#fff;padding:12px 22px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.4);text-align:center;border:2px solid #fbbf24';
        layer().appendChild(c);
      }
      c.innerHTML = `<div style="font-size:22px;font-weight:700">${main}</div>` + (sub ? `<div style="font-size:15px;margin-top:4px;color:#fde68a">${sub}</div>` : '');
    },
    mark(x, y) {
      const m = document.createElement('div');
      m.style.cssText = `position:fixed;left:${x - 28}px;top:${y - 28}px;width:56px;height:56px;border-radius:50%;border:5px solid #ef4444;box-shadow:0 0 0 6px rgba(239,68,68,.25);transition:transform .5s, opacity .5s`;
      layer().appendChild(m);
      setTimeout(() => { m.style.transform = 'scale(1.6)'; m.style.opacity = '0'; }, 900);
      setTimeout(() => m.remove(), 1500);
    },
    box(r, color, label) {
      const b = document.createElement('div');
      b.style.cssText = `position:fixed;left:${r.x - 4}px;top:${r.y - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:5px solid ${color};border-radius:6px`;
      b.innerHTML = `<div style="position:absolute;left:0;top:-30px;white-space:nowrap;background:${color};color:#fff;font-size:15px;font-weight:700;padding:3px 8px;border-radius:6px">${label}</div>`;
      layer().appendChild(b);
    },
  };
}
