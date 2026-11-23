import { expect, type APIRequestContext, type Page } from '@playwright/test'
import type { Config } from '../../src/domain/tipos'
import { ENTORNO_E2E } from './entorno'

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

/** Face ID simulado: autenticador de plataforma con verificación de usuario (Chromium CDP). Sin PRF salvo que se pida. */
export async function conFaceIdVirtual(page: Page, { prf = false } = {}) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
      ...(prf ? { hasPrf: true } : {}),
    },
  })
  return cdp
}

/** Registra una passkey en el autenticador virtual vía /configurar (deja sesión de owner). */
export async function registrarFaceId(page: Page, opciones: { prf?: boolean } = {}): Promise<void> {
  await conFaceIdVirtual(page, opciones)
  await page.goto('/configurar')
  await page.getByLabel('Código de configuración').fill(ENTORNO_E2E.SETUP_CODE)
  await page.getByRole('button', { name: 'Registrar Face ID' }).click()
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/$/)
}
