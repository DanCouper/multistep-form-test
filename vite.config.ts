/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["e2e/**/*.ts"],
          browser: {
            enabled: true,
            headless: true,
            testerHtmlPath: "index.html",
            provider: playwright({ launchOptions: { channel: "chromium" } }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.test.ts"],
        },
      },
    ],
  },
});
