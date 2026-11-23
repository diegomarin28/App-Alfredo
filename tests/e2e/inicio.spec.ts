import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'

const HOY = '2026-11-22'
const DATOS = {
  fechas: [{ nombre: 'Ana', tipo: 'cumple', dia: '11-25' }],
  vencimientos: [{ titulo: 'Seguro camioneta', ambito: 'personal', fecha: '2026-11-27', avisarDiasAntes: 7, hecho: false }],
  pendientes: [1, 2, 3].map((n) => ({ texto: `Pendiente ${n}`, hecho: false, creadoEn: '2026-11-20T10:00:00Z' })),
  fotos: [{ path: 'fotos/a.jpg' }, { path: 'fotos/b.jpg' }],
}

test('owner: saludo, foto, lo próximo y accesos', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  await expect(page.getByText('Domingo 22 de noviembre')).toBeVisible()
  await expect(page.locator('img[src*="fotos/"]')).toHaveCount(1)
  const prox = page.getByRole('region', { name: 'Lo próximo' })
  await expect(prox).toContainText('Cumple de Ana')
  await expect(prox).toContainText('En 3 días')
  await expect(prox).toContainText('En 5 días')
  await expect(prox).toContainText('3 pendientes')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav).toBeVisible()
  // Etiquetas a 16 px (barra de abajo y barra lateral), sin desbordar su lugar ni en el teléfono más angosto.
  const ancho = page.viewportSize()!.width
  for (const n of ['Inicio', 'Calendario', 'Mensajes', 'Portofino']) {
    const link = nav.getByRole('link', { name: n })
    expect(await link.evaluate((el) => getComputedStyle(el).fontSize), n).toBe('16px')
    const span = link.locator('span')
    expect(await span.evaluate((el) => el.getBoundingClientRect().width <= el.parentElement!.getBoundingClientRect().width), n).toBe(true)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(ancho)
})

for (const [nombre, ruta] of [
  ['Vencimientos', '/vencimientos'], ['Pendientes', '/pendientes'], ['Documentos', '/documentos'],
  ['Contraseñas', '/claves'], ['Contactos', '/contactos'],
]) {
  test(`acceso ${nombre} navega`, async ({ page }) => {
    await resetear(page, { datos: DATOS, hoy: HOY })
    await entrarComo(page, 'owner')
    await page.goto('/')
    await page.getByRole('link', { name: nombre, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(`${ruta}$`))
  })
}

test('repo vacío: Inicio muestra textos vacíos', async ({ page }) => {
  await resetear(page, { sinSeed: true, hoy: HOY })
  await entrarComo(page, 'owner')
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  await expect(page.getByText('Todavía no hay fotos')).toBeVisible()
  await expect(page.getByRole('link', { name: /Agregar fotos/ })).toHaveAttribute('href', '/fotos')
  await expect(page.getByText('No hay cumpleaños cargados')).toBeVisible()
  await expect(page.getByText('No hay vencimientos pendientes')).toBeVisible()
  await expect(page.getByText('No hay pendientes')).toBeVisible()
})

test('familia: sin accesos, vencimientos ni pendientes; barra sin Contame/Mensajes', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'familia')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  const prox = page.getByRole('region', { name: 'Lo próximo' })
  await expect(prox).toContainText('Cumple de Ana')
  await expect(prox).not.toContainText('En 5 días')
  await expect(prox).not.toContainText('pendientes')
  for (const n of ['Vencimientos', 'Pendientes', 'Documentos', 'Contraseñas', 'Contactos']) {
    await expect(page.getByRole('link', { name: n, exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('link', { name: 'Hablar con el asistente' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Mensajes' })).toHaveCount(0)
})

for (const rol of ['owner', 'familia'] as const) {
  test(`${rol}: con una foto, Inicio lleva a /fotos (foto y "Agregar fotos")`, async ({ page }) => {
    await resetear(page, { datos: { fotos: [{ path: 'fotos/a.jpg' }] }, hoy: HOY })
    await entrarComo(page, rol)
    await page.goto('/')
    const foto = page.getByRole('link', { name: 'Foto familiar del día' })
    await expect(foto).toHaveAttribute('href', '/fotos')
    const agregar = page.getByRole('link', { name: 'Agregar fotos' })
    await expect(agregar).toHaveAttribute('href', '/fotos')
    expect((await agregar.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await foto.click()
    await expect(page).toHaveURL(/\/fotos$/)
    await page.goto('/')
    await agregar.click()
    await expect(page).toHaveURL(/\/fotos$/)
    await expect(page.getByRole('heading', { name: 'Fotos de la familia' })).toBeVisible()
  })
}
