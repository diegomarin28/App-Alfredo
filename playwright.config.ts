import { defineConfig, devices, type Project } from '@playwright/test'
import { ENTORNO_E2E } from './tests/e2e/entorno'
import { hoyMontevideo } from './src/domain/fechas'

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
  // Las capturas (@capturas) solo corren con `pnpm capturas` y la medición (@medir) con `pnpm medir`.
  grepInvert: new RegExp([!process.env.CAPTURAS && '@capturas', !process.env.MEDIR && '@medir'].filter(Boolean).join('|') || '$^'),
  // Compila todas las pantallas antes de empezar (ver tests/e2e/precalentar.ts).
  globalSetup: './tests/e2e/precalentar.ts',
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // El 25/11 (cumple de Alfredo) el brindis tapa la parte de arriba: se da por visto hoy (CLAVE_BRINDIS). Las pruebas
    // que fijan "hoy" en un cumple lo manejan ellas; la del brindis arranca sin esto (detalles.spec).
    storageState: {
      cookies: [],
      origins: [{ origin: `http://localhost:${PORT}`, localStorage: [{ name: 'alfredo:brindis', value: hoyMontevideo(new Date()) }] }],
    },
  },
  projects,
  webServer: {
    command: 'pnpm dev',
    url: `http://localhost:${PORT}`,
    // Nunca reusar: un servidor ya levantado podría no tener las variables de prueba.
    reuseExistingServer: false,
    // `pnpm medir` simula la demora de Supabase visto desde Vercel (iad1 → sa-east-1): 100 ms por consulta,
    // o MEDIR_LATENCIA_MS.
    env: { ...ENTORNO_E2E, ...(process.env.MEDIR ? { DATA_LATENCIA_MS: process.env.MEDIR_LATENCIA_MS ?? '100' } : {}) },
  },
})
