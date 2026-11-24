import { test, expect } from '@playwright/test'
import { entrarComo, hidratado, resetear } from './helpers'

const HOY = '2026-11-22'

test('agregar con el +: en la hoja, con Enter y con Guardar', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/pendientes')
  await expect(page.getByText('No hay pendientes')).toBeVisible()
  const mas = page.getByRole('button', { name: 'Agregar pendiente' })
  await hidratado(mas)
  await mas.click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo pendiente' })
  await hoja.getByLabel('Qué hay que hacer').fill('Llamar al contador')
  await hoja.getByLabel('Qué hay que hacer').press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const abiertos = page.getByRole('region', { name: 'Por hacer' })
  await expect(abiertos).toContainText('Llamar al contador')
  await mas.click()
  await hoja.getByLabel('Qué hay que hacer').fill('Comprar pilas')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(abiertos).toContainText('Comprar pilas')
  await page.reload()
  await expect(abiertos.getByRole('listitem')).toHaveCount(2)
})

test('tildar mueve a Hechos (plegados) tachado y destildar reabre', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { pendientes: [{ texto: 'Pagar luz', hecho: false, creadoEn: '2026-11-20T12:00:00.000Z' }] } })
  await entrarComo(page, 'owner')
  await page.goto('/pendientes')
  const abiertos = page.getByRole('region', { name: 'Por hacer' })
  const hechos = page.getByRole('region', { name: 'Hechos' })
  const tildar = abiertos.getByRole('checkbox', { name: 'Pagar luz' })
  await hidratado(tildar)
  const caja = (await tildar.boundingBox())!
  expect(caja.width).toBeGreaterThanOrEqual(44)
  expect(caja.height).toBeGreaterThanOrEqual(44)
  await tildar.click() // la fila se va a Hechos al instante
  await expect(abiertos).not.toContainText('Pagar luz')
  await page.getByText('Hechos (1)').click()
  await expect(hechos).toContainText('Pagar luz')
  await expect(hechos.getByText('Pagar luz')).toHaveCSS('text-decoration-line', 'line-through')
  await hechos.getByRole('checkbox', { name: 'Pagar luz' }).click()
  await expect(abiertos).toContainText('Pagar luz')
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
  await expect(filas.nth(0)).not.toContainText('Nota de voz')
  await expect(filas.nth(0)).toContainText('22 de noviembre')
  await expect(filas.nth(1)).toContainText('Nota de voz')
  await expect(filas.nth(1)).toContainText('10 de noviembre')
  const nota = page.getByRole('button', { name: 'Agregar nota' })
  await hidratado(nota)
  await nota.click()
  await page.getByRole('dialog', { name: 'Nueva nota' }).getByLabel('Escribir una nota').fill('Idea para el jardín')
  await page.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(filas.nth(0)).toContainText('Idea para el jardín')
})

test('familia no entra', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'familia')
  await page.goto('/pendientes')
  await expect(page).not.toHaveURL(/pendientes/)
})
