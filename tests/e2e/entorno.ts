/** Valores de entorno SOLO para el servidor de pruebas (no son secretos reales). */
export const ENTORNO_E2E = {
  DATA_BACKEND: 'memory',
  ENABLE_TEST_ROUTES: '1',
  AI_BACKEND: 'fake',
  SETUP_CODE: 'codigo-de-prueba-123',
  SESSION_SECRET: 'secreto-de-desarrollo-solo-para-pruebas-e2e-0123456789',
  FAMILY_CODE: 'familia-prueba-456',
  FAMILY_EXPIRES_AT: '2099-12-31T23:59:00-03:00',
  NEXT_PUBLIC_RP_ID: 'localhost',
  APP_ORIGIN: 'http://localhost:3100',
} as const
