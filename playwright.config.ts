import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: "http://127.0.0.1:4323",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev:local --host 127.0.0.1 --port 4323",
    url: "http://127.0.0.1:4323/_emdash/api/auth/mode",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
