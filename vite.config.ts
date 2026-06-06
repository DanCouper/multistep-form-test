/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  test: {
    include: ["e2e/**/*.ts", "src/**/*.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      testerHtmlPath: "index.html",
      provider: playwright({
        launchOptions: {
          channel: "chromium",
        },
      }),
      instances: [{ browser: "chromium" }],
    },
  },
});
