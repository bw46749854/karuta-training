import { defineConfig } from '@playwright/test';

// DEMO=1 shows the browser window, slows every action, adds captions and records video.
const demo = !!process.env.DEMO;
const port = Number(process.env.PORT ?? 4173);

export default defineConfig({
  testDir: './tests',
  timeout: demo ? 180_000 : 60_000,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 880 },
    headless: !demo,
    video: demo ? 'on' : 'retain-on-failure',
    launchOptions: {
      // Optional: use an already installed Chromium instead of `npx playwright install`
      executablePath: process.env.PW_CHROMIUM_EXECUTABLE || undefined,
      slowMo: demo ? 150 : 0,
    },
  },
  webServer: {
    command: `node serve.mjs ${port}`,
    url: `http://127.0.0.1:${port}/index.html`,
    reuseExistingServer: true,
  },
});
