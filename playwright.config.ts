import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 13'].userAgent,
    channel: 'chrome',
    launchOptions: {
      args: ['--no-sandbox', '--disable-crash-reporter', '--disable-breakpad'],
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node ./node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
