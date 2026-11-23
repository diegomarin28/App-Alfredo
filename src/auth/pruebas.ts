/**
 * Las rutas /api/test/* solo existen con las TRES condiciones:
 * ENABLE_TEST_ROUTES=1, NODE_ENV distinto de production y datos en memoria.
 */
export function rutasDePruebaHabilitadas(env: Record<string, string | undefined> = process.env): boolean {
  const memoria = !env.DATA_BACKEND || env.DATA_BACKEND === 'memory'
  return env.ENABLE_TEST_ROUTES === '1' && env.NODE_ENV !== 'production' && memoria
}
