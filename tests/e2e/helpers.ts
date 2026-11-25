import { expect, type APIRequestContext, type BrowserContext, type Locator, type Page } from '@playwright/test'
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

/**
 * Reconocimiento de voz falso, manejable desde la prueba con window.__voz.
 * start() avisa "start" y "audiostart" como Safari; stop()/abort() mandan "end" (después de `__voz.demorarFin(ms)`).
 * `ios` (ronda 10, según el registro del iPhone real): una instancia creada después de que otra arrancó queda sorda
 * (start y audiostart, pero nunca voz); reusar la misma con start() después de su "end" anda.
 * `__voz.trabar()`: el motor queda sordo hasta recargar la página; `trabar(true)`, también después de recargar.
 */
export function instalarVozFalsa(opciones: { ios?: boolean } = {}) {
  const ios = !!opciones?.ios
  type Res = { isFinal: boolean; 0: { transcript: string } }
  const CLAVE_TRABADO = '__voz:trabado'
  const estado = { instancias: [] as FakeRec[], starts: 0, trabado: sessionStorage.getItem(CLAVE_TRABADO) === '1', demoraFin: 0 }
  class FakeRec {
    lang = ''
    continuous = false
    interimResults = false
    onresult: ((e: { resultIndex: number; results: Res[] }) => void) | null = null
    onerror: ((e: { error: string }) => void) | null = null
    onend: (() => void) | null = null
    onstart: (() => void) | null = null
    onaudiostart: (() => void) | null = null
    activo = false
    parando = false
    sordo = false
    resultados: Res[] = []
    constructor() {
      this.sordo = ios && estado.instancias.some((o) => o.arranco)
      estado.instancias.push(this)
    }
    arranco = false
    start() {
      if (this.activo || this.parando) throw new DOMException('ya empezó', 'InvalidStateError')
      this.activo = true
      this.arranco = true
      this.resultados = []
      estado.starts++
      // sordo o trabado: arranca y "abre el micrófono" igual, pero nunca llega voz
      setTimeout(() => { if (this.activo) { this.onstart?.(); this.onaudiostart?.() } }, 0)
    }
    private terminar() {
      if (!this.activo) return
      this.activo = false
      this.parando = true
      setTimeout(() => { this.parando = false; this.onend?.() }, estado.demoraFin)
    }
    stop() { this.terminar() }
    abort() { this.terminar() }
  }
  const actual = () => estado.instancias.filter((r) => r.activo).pop()
  // Chromium trae uno real (también sin prefijo): se reemplazan los dos.
  ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRec
  ;(window as unknown as Record<string, unknown>).SpeechRecognition = FakeRec
  ;(window as unknown as Record<string, unknown>).__voz = {
    decir(texto: string, isFinal = true) {
      const r = actual()
      if (!r) throw new Error('no está escuchando')
      if (r.sordo || estado.trabado) return
      const i = r.resultados.findIndex((x) => !x.isFinal)
      const idx = i >= 0 ? i : r.resultados.length
      r.resultados[idx] = { isFinal, 0: { transcript: texto } }
      r.onresult?.({ resultIndex: idx, results: [...r.resultados] })
    },
    /** Safari corta solo en un silencio */
    cortar() {
      const r = actual()
      if (!r) throw new Error('no está escuchando')
      r.activo = false
      r.onend?.()
    },
    error(codigo: string) {
      const r = actual()
      if (!r) throw new Error('no está escuchando')
      r.onerror?.({ error: codigo })
      r.activo = false
      r.onend?.()
    },
    starts: () => estado.starts,
    instancias: () => estado.instancias.length,
    trabar(siempre = false) {
      estado.trabado = true
      if (siempre) sessionStorage.setItem(CLAVE_TRABADO, '1')
    },
    demorarFin(ms: number) {
      estado.demoraFin = ms
    },
  }
}

/** Reemplaza la cola de respuestas de la IA falsa (ruta de pruebas). */
export async function guion(page: Page, respuestas: object[]) {
  const r = await page.request.post('/api/test/ai', { data: { respuestas } })
  expect(r.status()).toBe(200)
}

export const decir = (page: Page, t: string, final = true) =>
  page.evaluate(([t, f]) => (window as unknown as { __voz: { decir(t: string, f: boolean): void } }).__voz.decir(t as string, f as boolean), [t, final] as const)

/** Junta los errores de consola y de página para revisarlos después con sinErroresNiDesborde. */
export function vigilarErrores(page: Page): string[] {
  const errores: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errores.push(`console: ${m.text()}`) })
  page.on('pageerror', (e) => { errores.push(`pageerror: ${e.message}`) })
  return errores
}

/** La página no dio errores y no se desborda hacia los costados (el ancho de la pantalla del proyecto). */
export async function sinErroresNiDesborde(page: Page, errores: string[], donde: string): Promise<void> {
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(ancho, `desborde horizontal en ${donde}`).toBeLessThanOrEqual(page.viewportSize()!.width)
  expect(errores, `errores de consola en ${donde}`).toEqual([])
}

/** Espera a que React haya enganchado el elemento (un toque antes de eso no hace nada, sobre todo en `next dev`). */
export async function hidratado(el: Locator): Promise<void> {
  // 10 s: con la suite entera, `next dev` a veces tarda más de 5 s en hidratar
  await expect.poll(() => el.evaluate((n) => Object.keys(n).some((k) => k.startsWith('__reactProps'))), { timeout: 10_000 }).toBe(true)
}

/**
 * Retiene el JavaScript de la página, como un teléfono lento: el HTML del servidor ya se ve y se puede
 * escribir, pero React todavía no enganchó. Devuelve la función que lo suelta.
 */
export async function retenerJavaScript(page: Page): Promise<() => void> {
  let soltar!: () => void
  const retenido = new Promise<void>((r) => { soltar = r })
  await page.route('**/_next/static/chunks/**', async (ruta) => { await retenido; await ruta.continue() })
  return soltar
}

/**
 * Portapapeles en la prueba. Chromium: permisos de leer y escribir. WebKit no conoce esos permisos y
 * no deja leer sin un toque del usuario, así que se anota lo que la app copia (la copia real igual se hace).
 */
export async function permitirPortapapeles(context: BrowserContext, browserName: string): Promise<void> {
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3100' })
    return
  }
  await context.addInitScript(() => {
    const original = navigator.clipboard.writeText.bind(navigator.clipboard)
    navigator.clipboard.writeText = async (texto: string) => {
      await original(texto)
      ;(window as unknown as { __copiado?: string }).__copiado = texto
    }
  })
}

/** Lo último que la app copió (ver permitirPortapapeles). */
export function leerPortapapeles(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as { __copiado?: string }).__copiado ?? navigator.clipboard.readText())
}
