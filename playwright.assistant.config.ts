import { defineConfig } from "@playwright/test";

// Isolated production-build tests. Chat is intercepted in the test, not the app;
// the real confirmation API verifies these test-only signed review cards.
process.env.AI_ACTION_SECRET = "assistant-browser-test-signing-key-not-for-production";
export default defineConfig({
  testDir: "./src/features/assistant",
  testMatch: "**/*.browser.spec.ts",
  outputDir: "/tmp/hackleaf-assistant-playwright",
  reporter: "line",
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3310", channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome", viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3310",
    url: "http://127.0.0.1:3310/api/health",
    reuseExistingServer: false,
    env: { APP_DATA_MODE: "demo", AI_DEMO_ENABLED: "true", AI_ACTION_SECRET: process.env.AI_ACTION_SECRET },
  },
});
