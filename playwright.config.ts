import { defineConfig, devices } from '@playwright/test'
import { ENTORNO_E2E } from './tests/e2e/entorno'

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
    // Nunca reusar: un servidor ya levantado podría no tener las variables de prueba.
    reuseExistingServer: false,
    env: { ...ENTORNO_E2E },
  },
})
