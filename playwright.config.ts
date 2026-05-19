import { defineConfig, devices } from '@playwright/test'

const PORT    = Number(process.env.PLAYWRIGHT_PORT ?? 3100)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir:       './tests/e2e',
  timeout:       30 * 1000,
  expect:        { timeout: 5000 },
  fullyParallel: true,
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 2 : 0,
  workers:       process.env.CI ? 1 : undefined,
  reporter:      process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL:            BASE_URL,
    trace:              'retain-on-failure',
    screenshot:         'only-on-failure',
    video:              'retain-on-failure',
    actionTimeout:      10_000,
    navigationTimeout:  20_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile',   use: { ...devices['iPhone 14'] } },
  ],

  // When PLAYWRIGHT_BASE_URL is set we assume the caller is running
  // against a remote server and skip booting a local one.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `next start -p ${PORT}`,
        url:     BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
})
