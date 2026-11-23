import { test, expect, type Page } from '@playwright/test'
import { entrarComo, resetear } from './helpers'

const LG = 1024

async function cajas(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav).toHaveCount(1)
  await expect(nav).toBeVisible()
  const n = (await nav.boundingBox())!
  const m = (await page.locator('main').first().boundingBox())!
  const { width: vw, height: vh } = page.viewportSize()!
  return { n, m, vw, vh }
}

/** En computadora el contenido va centrado en el espacio a la derecha de la barra lateral. */
async function esperarBarraLateral(page: Page) {
  const { n, m, vw, vh } = await cajas(page)
  // barra lateral fija a la izquierda, a toda la altura
  expect(n.x).toBe(0)
  expect(n.y).toBe(0)
  expect(n.height).toBeGreaterThanOrEqual(vh - 1)
  expect(n.width).toBeLessThan(320)
  // nada de barra abajo
  expect(n.width).toBeLessThan(vw)
  // contenido: ≤ 720 px, sin quedar debajo de la barra, centrado en el espacio libre
  expect(m.width).toBeLessThanOrEqual(720)
  expect(m.x).toBeGreaterThanOrEqual(n.x + n.width)
  const izquierda = m.x - (n.x + n.width)
  const derecha = vw - (m.x + m.width)
  expect(Math.abs(izquierda - derecha)).toBeLessThanOrEqual(1)
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(ancho).toBeLessThanOrEqual(vw)
}

test.beforeEach(async ({ page }) => {
  await resetear(page)
  await entrarComo(page, 'owner')
})

test('navegación: barra de abajo en el teléfono, barra lateral en computadora', async ({ page }) => {
  await page.goto('/')
  const { n, vw, vh } = await cajas(page)
  if (vw >= LG) {
    await esperarBarraLateral(page)
  } else {
    // barra de abajo, de lado a lado, pegada al borde inferior
    expect(n.x).toBe(0)
    expect(n.width).toBe(vw)
    expect(Math.abs(n.y + n.height - vh)).toBeLessThanOrEqual(1)
  }
  // los mismos enlaces en los dos diseños
  for (const nombre of ['Inicio', 'Calendario', 'Hablar con el asistente', 'Mensajes', 'Portofino']) {
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: nombre })).toBeVisible()
  }
})

test('computadora: a 1024 px el contenido tampoco queda debajo de la barra lateral', async ({ page }) => {
  test.skip(page.viewportSize()!.width < LG, 'solo en computadora')
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/')
  await esperarBarraLateral(page)
})
