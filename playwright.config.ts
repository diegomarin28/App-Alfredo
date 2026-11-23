import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { DATA_BACKEND: 'memory', ENABLE_TEST_ROUTES: '1', AI_BACKEND: 'fake' },
  },
})
