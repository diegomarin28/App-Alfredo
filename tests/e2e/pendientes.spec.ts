import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'

const HOY = '2026-11-22'

test('agregar con Enter y con el botón', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/pendientes')
  await expect(page.getByText('No hay pendientes')).toBeVisible()
  const campo = page.getByLabel('Agregar pendiente')
  await campo.fill('Llamar al contador')
  await campo.press('Enter')
  const abiertos = page.getByRole('region', { name: 'Por hacer' })
  await expect(abiertos).toContainText('Llamar al contador')
  await expect(campo).toHaveValue('')
  await campo.fill('Comprar pilas')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(abiertos).toContainText('Comprar pilas')
  await page.reload()
  await expect(abiertos.getByRole('listitem')).toHaveCount(2)
})

test('tildar mueve a Hechos tachado y destildar reabre', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { pendientes: [{ texto: 'Pagar luz', hecho: false, creadoEn: '2026-11-20T12:00:00.000Z' }] } })
  await entrarComo(page, 'owner')
  await page.goto('/pendientes')
  const abiertos = page.getByRole('region', { name: 'Por hacer' })
  const hechos = page.getByRole('region', { name: 'Hechos' })
  await abiertos.getByRole('checkbox', { name: 'Pagar luz' }).click()
  await expect(hechos).toContainText('Pagar luz')
  await expect(abiertos).not.toContainText('Pagar luz')
  await expect(hechos.getByText('Pagar luz')).toHaveCSS('text-decoration-line', 'line-through')
  await hechos.getByRole('checkbox', { name: 'Pagar luz' }).click()
  await expect(abiertos).toContainText('Pagar luz')
  const caja = await abiertos.getByRole('checkbox', { name: 'Pagar luz' }).boundingBox()
  expect(caja!.width).toBeGreaterThanOrEqual(44)
  expect(caja!.height).toBeGreaterThanOrEqual(44)
})

test('notas: origen, fecha, orden y agregar escrita', async ({ page }) => {
  await resetear(page, {
    hoy: HOY,
    datos: {
      notas: [
        { texto: 'Nota vieja de voz', origen: 'voz', creadoEn: '2026-11-10T15:00:00.000Z' },
        { texto: 'Nota reciente escrita', origen: 'escrita', creadoEn: '2026-11-22T15:00:00.000Z' },
      ],
    },
  })
  await entrarComo(page, 'owner')
  await page.goto('/pendientes')
  const notas = page.getByRole('region', { name: 'Notas' })
  const filas = notas.getByRole('listitem')
  await expect(filas.nth(0)).toContainText('Nota reciente escrita')
  await expect(filas.nth(0)).toContainText('Escrita')
  await expect(filas.nth(0)).toContainText('22 de noviembre')
  await expect(filas.nth(1)).toContainText('Nota de voz')
  await expect(filas.nth(1)).toContainText('10 de noviembre')
  await page.getByLabel('Escribir una nota').fill('Idea para el jardín')
  await page.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(filas.nth(0)).toContainText('Idea para el jardín')
  await expect(filas.nth(0)).toContainText('Escrita')
})

test('familia no entra', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'familia')
  await page.goto('/pendientes')
  await expect(page).not.toHaveURL(/pendientes/)
})
