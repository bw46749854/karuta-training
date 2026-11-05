import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const isCI = process.env["CI"] !== undefined;
// A browser already on the machine, for places where Playwright cannot
// download its own (the cloud session's brief §7). Only Chromium runs then;
// Firefox, WebKit and the iPad are left to CI.
const chromePath = process.env["CHROME_PATH"];

const chromium = {
  name: "chromium",
  use: {
    ...devices["Desktop Chrome"],
    ...(chromePath === undefined
      ? {}
      : { launchOptions: { executablePath: chromePath } }),
  },
};

// Design principles §4: Chromium, Firefox and WebKit, plus an iPad-sized
// touch device.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: isCI,
  reporter: "list",
  use: { baseURL: `http://localhost:${String(port)}` },
  webServer: {
    command: `pnpm preview --port ${String(port)} --strictPort`,
    url: `http://localhost:${String(port)}`,
    reuseExistingServer: !isCI,
  },
  projects:
    chromePath === undefined
      ? [
          chromium,
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
          { name: "ipad", use: { ...devices["iPad (gen 7)"] } },
        ]
      : [chromium],
});
