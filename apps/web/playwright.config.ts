import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const isCI = process.env["CI"] !== undefined;

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
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "ipad", use: { ...devices["iPad (gen 7)"] } },
  ],
});
