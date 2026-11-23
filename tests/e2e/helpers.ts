import { expect, type APIRequestContext, type Page } from '@playwright/test'
import type { Config } from '../../src/domain/tipos'

export type Rol = 'owner' | 'familia'

export interface ArgsReset {
  /** filas a crear por entidad, p. ej. { fechas: [{ nombre: 'Ana', tipo: 'cumple', dia: '11-25' }] } */
  datos?: Record<string, object[]>
  config?: Partial<Config>
  /** true: no cargar los recordatorios y carpetas iniciales */
  sinSeed?: boolean
  /** YYYY-MM-DD: "hoy" del servidor; sin esto vuelve a la fecha real */
  hoy?: string
}

function contexto(x: APIRequestContext | Page): APIRequestContext {
  return 'goto' in x ? x.request : x
}

/** Deja la sesión del navegador con el rol pedido (ruta de pruebas). */
export async function entrarComo(page: Page, rol: Rol): Promise<void> {
  const res = await page.request.post('/api/test/login', { data: { rol } })
  expect(res.status(), (await res.text()).slice(0, 200)).toBe(200)
}

/** Vacía el repo en memoria, carga seed + datos y fija "hoy" (ruta de pruebas). */
export async function resetear(x: APIRequestContext | Page, args: ArgsReset = {}): Promise<void> {
  const res = await contexto(x).post('/api/test/reset', { data: args })
  expect(res.status(), (await res.text()).slice(0, 200)).toBe(200)
}
