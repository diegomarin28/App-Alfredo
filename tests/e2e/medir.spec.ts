import { test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { entrarComo, resetear } from './helpers'

/**
 * `pnpm medir` (no corre con `pnpm e2e`): tiempo de navegación Inicio → Calendario → Inicio tocando el menú.
 * "respuesta" = hasta que se ve algo de la pantalla nueva (esqueleto de carga o la pantalla);
 * "lista" = hasta que se ve el título de la pantalla nueva. Deja capturas/medicion-<MEDIR>-<proyecto>.json.
 * Simula ~100 ms por lectura de datos (o MEDIR_LATENCIA_MS; ver playwright.config.ts), como Supabase visto desde Vercel.
 * Ojo: corre contra `next dev` (sin prefetch, que Next hace solo en producción); sirve para comparar antes/después.
 */

const VUELTAS = 10
const CALENTAR = 2
const SALUDO = /^(Buen día|Buenas tardes|Buenas noches),/

/** Toca el link del menú y mide en la página misma (cuadro a cuadro) hasta que aparece el título pedido. */
async function ir(page: Page, link: string, titulo: RegExp) {
  return page.evaluate(async ({ link, patron }) => {
    const re = new RegExp(patron)
    const a = [...document.querySelectorAll('nav[aria-label="Principal"] a')].find((x) => x.textContent?.trim() === link) as HTMLAnchorElement
    const t0 = performance.now()
    a.click()
    let respuesta: number | undefined
    return new Promise<{ respuesta: number; lista: number }>((listo) => {
      const mirar = () => {
        const t = Math.round(performance.now() - t0)
        const h1 = [...document.querySelectorAll('h1')].some((h) => re.test(h.textContent ?? ''))
        if (respuesta === undefined && (h1 || document.querySelector('[data-esqueleto]'))) respuesta = t
        if (h1) listo({ respuesta: respuesta!, lista: t })
        else requestAnimationFrame(mirar)
      }
      requestAnimationFrame(mirar)
    })
  }, { link, patron: titulo.source })
}

const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

test('navegación Inicio → Calendario → Inicio @medir', async ({ page }, info) => {
  test.setTimeout(120_000)
  await resetear(page, { hoy: '2026-11-22' })
  await entrarComo(page, 'owner')
  await page.goto('/')
  await page.getByRole('heading', { level: 1, name: SALUDO }).waitFor()
  const tramos: Record<string, { respuesta: number[]; lista: number[] }> = {
    'Inicio→Calendario': { respuesta: [], lista: [] }, 'Calendario→Inicio': { respuesta: [], lista: [] },
  }
  for (let i = 0; i < CALENTAR + VUELTAS; i++) {
    const ida = await ir(page, 'Calendario', /^Calendario$/)
    const vuelta = await ir(page, 'Inicio', SALUDO)
    if (i < CALENTAR) continue
    for (const [t, m] of [['Inicio→Calendario', ida], ['Calendario→Inicio', vuelta]] as const) {
      tramos[t].respuesta.push(m.respuesta)
      tramos[t].lista.push(m.lista)
    }
  }
  const resumen = Object.fromEntries(Object.entries(tramos).map(([t, m]) => [t, {
    respuestaMediana: mediana(m.respuesta), listaMediana: mediana(m.lista), lista: m.lista,
  }]))
  console.log(info.project.name, JSON.stringify(resumen))
  const dir = path.join(__dirname, '..', '..', 'capturas')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, `medicion-${process.env.MEDIR}-${process.env.MEDIR_LATENCIA_MS ?? 100}ms-${info.project.name}.json`), JSON.stringify(resumen, null, 2))
})
