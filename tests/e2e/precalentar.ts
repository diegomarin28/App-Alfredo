import { request, type FullConfig } from '@playwright/test'
import { PANTALLAS } from './pantallas'

/**
 * Antes de las pruebas: pide cada pantalla una vez para que `next dev` la compile. Si no, la primera visita
 * a una ruta la compila en plena prueba y el cliente de desarrollo recarga la página (WebKit lo nota como
 * "navigation interrupted by another navigation").
 */
export default async function precalentar(config: FullConfig): Promise<void> {
  const ctx = await request.newContext({ baseURL: config.projects[0].use.baseURL })
  for (const ruta of ['/entrar', '/configurar', '/familia', '/esto-no-existe']) await ctx.get(ruta)
  await ctx.post('/api/test/login', { data: { rol: 'owner' } })
  const rutas = new Set(PANTALLAS.filter((p) => p.rol).map((p) => (p.ruta === 'carpeta' ? '/documentos/no-existe' : p.ruta)))
  for (const ruta of rutas) await ctx.get(ruta)
  // Las rutas de la API también se compilan la primera vez: con un cuerpo inválido (400) no guardan nada, y
  // "Guardar todo" o "Deshacer" no tardan más de lo que espera la prueba.
  for (const ruta of ['/api/ai/contame', '/api/ai/mensajes', '/api/contame/guardar', '/api/contame/deshacer']) {
    await ctx.post(ruta, { data: {} })
  }
  await ctx.dispose()
}
