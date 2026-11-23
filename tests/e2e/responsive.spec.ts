import { test, expect, type Page } from '@playwright/test'
import { entrarComo, hidratado, resetear } from './helpers'

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

/** Hoja de abajo en el teléfono; en computadora, centrada sobre la columna del contenido (no tapa la barra lateral). */
async function esperarHoja(page: Page, dialogo: ReturnType<Page['getByRole']>) {
  await expect(dialogo).toBeVisible()
  const d = (await dialogo.boundingBox())!
  const { n, m, vw, vh } = await cajas(page)
  if (vw >= LG) {
    expect(d.x).toBeGreaterThanOrEqual(n.x + n.width)
    expect(d.width).toBeLessThanOrEqual(720)
    expect(Math.abs(d.x + d.width / 2 - (m.x + m.width / 2))).toBeLessThanOrEqual(1)
    expect(Math.abs(d.y + d.height / 2 - vh / 2)).toBeLessThanOrEqual(1)
  } else {
    expect(d.x).toBe(0)
    expect(d.width).toBe(vw)
    expect(Math.abs(d.y + d.height - vh)).toBeLessThanOrEqual(1)
  }
}

test('hojas y confirmaciones: abajo en el teléfono, centradas en la columna en computadora', async ({ page }) => {
  await resetear(page, { datos: { contactos: [{ nombre: 'Martín Pérez', tipo: 'cliente' }], fechas: [{ nombre: 'Ana', tipo: 'cumple', dia: '11-25' }] } })
  await page.goto('/contactos')
  const agregar = page.getByRole('button', { name: 'Agregar contacto' })
  await hidratado(agregar)
  await agregar.click()
  await esperarHoja(page, page.getByRole('dialog', { name: 'Agregar contacto' }))

  await page.goto('/calendario')
  const borrar = page.getByRole('button', { name: 'Borrar' })
  await hidratado(borrar)
  await borrar.click()
  await esperarHoja(page, page.getByRole('alertdialog'))
})
