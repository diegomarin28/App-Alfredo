import { defineConfig, devices, type Project } from '@playwright/test'
import { ENTORNO_E2E } from './tests/e2e/entorno'

const PORT = 3100

/** iPhone 14 en adelante (ancho × alto en puntos) y una computadora. */
const TELEFONOS = ['375x667', '390x844', '402x874', '430x932', '440x956']
const MOTORES = ['chromium', 'webkit'] as const

const projects: Project[] = MOTORES.flatMap((browserName) => [
  ...TELEFONOS.map((tam) => {
    const [width, height] = tam.split('x').map(Number)
    return {
      name: `${browserName}-${tam}`,
      use: {
        ...devices['iPhone 14'],
        browserName,
        viewport: { width, height },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    }
  }),
  {
    name: `${browserName}-desktop`,
    use: {
      ...(browserName === 'webkit' ? devices['Desktop Safari'] : devices['Desktop Chrome']),
      browserName,
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
])

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: `http://localhost:${PORT}` },
  projects,
  webServer: {
    command: 'pnpm dev',
    url: `http://localhost:${PORT}`,
    // Nunca reusar: un servidor ya levantado podría no tener las variables de prueba.
    reuseExistingServer: false,
    env: { ...ENTORNO_E2E },
  },
})
