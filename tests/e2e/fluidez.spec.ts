import { test, expect, type Page } from '@playwright/test'
import { entrarComo, hidratado, instalarVozFalsa, resetear } from './helpers'

// Más fluida: transición entre pantallas (View Transitions, si el navegador la tiene), paneles que suben al abrir
// y respuesta al tocar. Con "reducir movimiento", nada se mueve (lo tocado igual se aclara).

test.beforeEach(async ({ page }) => {
  await resetear(page, { hoy: '2026-11-22' })
  await entrarComo(page, 'owner')
  // cuenta las transiciones que arranca la app
  await page.addInitScript(() => {
    const w = window as unknown as { __transiciones: number }
    w.__transiciones = 0
    const original = typeof document.startViewTransition === 'function' ? document.startViewTransition.bind(document) : null
    if (original) {
      document.startViewTransition = ((cb: () => Promise<void>) => { w.__transiciones++; return original(cb) }) as typeof document.startViewTransition
    }
  })
})

const transiciones = (page: Page) => page.evaluate(() => (window as unknown as { __transiciones: number }).__transiciones)
const soporta = (page: Page) => page.evaluate(() => typeof document.startViewTransition === 'function')

async function irPorElMenu(page: Page) {
  await page.goto('/')
  const menu = page.getByRole('navigation', { name: 'Principal' })
  await hidratado(menu.getByRole('link', { name: 'Calendario' }))
  await menu.getByRole('link', { name: 'Calendario' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Calendario' })).toBeVisible()
  await menu.getByRole('link', { name: 'Inicio' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^(Buen día|Buenas tardes|Buenas noches),/ })).toBeVisible()
}

async function abrirPanel(page: Page) {
  await page.goto('/calendario')
  const agregar = page.getByRole('button', { name: 'Agregar fecha' })
  await hidratado(agregar)
  await agregar.click()
  const panel = page.getByRole('dialog', { name: 'Nueva fecha' })
  await expect(panel).toBeVisible()
  return {
    panel: await panel.evaluate((el) => getComputedStyle(el).animationName),
    fondo: await panel.evaluate((el) => getComputedStyle(el.parentElement!).animationName),
  }
}

/** Aprieta (sin soltar) un botón y devuelve cómo se ve mientras tanto. */
async function apretado(page: Page) {
  await page.goto('/mensajes')
  const boton = page.getByRole('radio', { name: 'Quiero escribir' })
  await hidratado(boton)
  const c = (await boton.boundingBox())!
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(250)
  const estilo = await boton.evaluate((el) => ({ opacidad: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform }))
  await page.mouse.up()
  return estilo
}

test('entre pantallas: el menú navega con transición donde el navegador la tiene', async ({ page }) => {
  await irPorElMenu(page)
  expect(await transiciones(page)).toBe((await soporta(page)) ? 2 : 0)
})

test('al abrir un panel, el fondo aparece y el panel sube', async ({ page }) => {
  expect(await abrirPanel(page)).toEqual({ panel: 'subir', fondo: 'aparecer' })
})

test('al tocar, el botón se achica y se aclara mientras se aprieta', async ({ page }) => {
  const { opacidad, transform } = await apretado(page)
  expect(Number(opacidad)).toBeCloseTo(0.85, 2)
  expect(transform).toMatch(/^matrix\(0\.97, 0, 0, 0\.97,/)
})

test('la hoja se cierra arrastrándola hacia abajo desde la manija', async ({ page }) => {
  await abrirPanel(page)
  const hoja = page.getByRole('dialog', { name: 'Nueva fecha' })
  await hoja.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
  const titulo = (await hoja.getByRole('heading', { name: 'Nueva fecha' }).boundingBox())!
  const x = titulo.x + 20
  const y = titulo.y + titulo.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 60, { steps: 4 })
  await page.mouse.move(x, y + 160, { steps: 4 })
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('sin el retraso del doble toque: todo lo que se toca tiene touch-action: manipulation', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('navigation', { name: 'Principal' })
  await expect(menu.getByRole('link', { name: 'Calendario' })).toHaveCSS('touch-action', 'manipulation')
  await page.goto('/mensajes')
  await expect(page.getByRole('radio', { name: 'Quiero escribir' })).toHaveCSS('touch-action', 'manipulation')
})

test('al tildar, el círculo se llena con un rebote', async ({ page }) => {
  await resetear(page, { hoy: '2026-11-22', datos: { pendientes: [{ texto: 'Pagar luz', hecho: false, creadoEn: '2026-11-20T12:00:00.000Z' }] } })
  await page.goto('/pendientes')
  const tildar = page.getByRole('checkbox', { name: 'Pagar luz' })
  await hidratado(tildar)
  await tildar.click()
  await expect.poll(() => page.locator('label:has(input[aria-label="Pagar luz"]) > span').evaluate((el) => getComputedStyle(el).animationName)).toBe('rebote')
})

test('Contame escuchando: los anillos respiran', async ({ page }) => {
  await page.addInitScript(instalarVozFalsa)
  await page.goto('/contame')
  const hablar = page.getByRole('button', { name: 'Tocá para hablar' })
  await hidratado(hablar)
  await hablar.click()
  const boton = page.getByRole('button', { name: 'Tocá para terminar' })
  await expect(boton).toBeVisible()
  expect(await boton.evaluate((b) => [...b.querySelectorAll('span')].map((s) => getComputedStyle(s).animationName))).toContain('respirar')
  await expect(page.getByText(/Te escucho · 0:0\d/)).toBeVisible()
})

test.describe('con "reducir movimiento"', () => {
  test.use({ reducedMotion: 'reduce' })

  test('sin transiciones entre pantallas ni paneles que se muevan', async ({ page }) => {
    await irPorElMenu(page)
    expect(await transiciones(page)).toBe(0)
    // solo un fundido: nada sube ni se mueve
    expect(await abrirPanel(page)).toEqual({ panel: 'aparecer', fondo: 'aparecer' })
  })

  test('al tocar se aclara pero no se achica', async ({ page }) => {
    const { opacidad, transform } = await apretado(page)
    expect(Number(opacidad)).toBeCloseTo(0.85, 2)
    expect(transform).toBe('none')
  })
})
