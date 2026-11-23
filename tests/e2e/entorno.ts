/** Valores de entorno SOLO para el servidor de pruebas (no son secretos reales). Los códigos: 20+ caracteres. */
export const ENTORNO_E2E = {
  DATA_BACKEND: 'memory',
  ENABLE_TEST_ROUTES: '1',
  AI_BACKEND: 'fake',
  SETUP_CODE: 'codigo-de-prueba-e2e-1234567',
  SESSION_SECRET: 'secreto-de-desarrollo-solo-para-pruebas-e2e-0123456789',
  AI_PRICE_INPUT_PER_MTOK: '3',
  AI_PRICE_OUTPUT_PER_MTOK: '15',
  FAMILY_CODE: 'familia-prueba-e2e-4567890',
  FAMILY_EXPIRES_AT: '2099-12-31T23:59:00-03:00',
  NEXT_PUBLIC_RP_ID: 'localhost',
  APP_ORIGIN: 'http://localhost:3100',
} as const
