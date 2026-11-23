import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'

const HOY = '2026-11-22'
const datos = {
  vencimientos: [
    { titulo: 'Patente camioneta', ambito: 'personal', fecha: '2026-12-31', avisarDiasAntes: 30, hecho: false },
    { titulo: 'Seguro del local', ambito: 'empresa', fecha: '2026-12-12', avisarDiasAntes: 30, hecho: false },
    { titulo: 'Balance anual', ambito: 'empresa', fecha: '2026-11-25', avisarDiasAntes: 7, hecho: false },
    { titulo: 'Habilitación vieja', ambito: 'empresa', fecha: '2026-11-20', avisarDiasAntes: 7, hecho: false },
    { titulo: 'Ya pagado', ambito: 'empresa', fecha: '2026-11-30', avisarDiasAntes: 7, hecho: true },
  ],
}

test('secciones, orden, fecha, chips y urgencia', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  const empresa = page.getByRole('region', { name: 'Empresa' })
  const personales = page.getByRole('region', { name: 'Personales' })
  const filas = empresa.getByRole('listitem')
  await expect(filas).toHaveCount(3)
  await expect(filas.nth(0)).toContainText('Habilitación vieja')
  await expect(filas.nth(0)).toContainText('Venció hace 2 días')
  await expect(filas.nth(0)).toContainText('Urgente')
  await expect(filas.nth(1)).toContainText('Balance anual')
  await expect(filas.nth(1)).toContainText('En 3 días')
  await expect(filas.nth(1)).toContainText('Urgente')
  await expect(filas.nth(2)).toContainText('12 de diciembre de 2026')
  await expect(filas.nth(2)).toContainText('En 20 días')
  await expect(filas.nth(2)).not.toContainText('Urgente')
  await expect(filas.nth(1).locator('.bg-urg-bg')).toHaveCount(1)
  await expect(filas.nth(2).locator('.bg-urg-bg')).toHaveCount(0)
  await expect(personales.getByRole('listitem')).toHaveCount(1)
  await expect(personales).toContainText('Patente camioneta')
  await expect(page.getByText('Ya pagado')).toHaveCount(0)
})

test('Hecho hace desaparecer la fila', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  const fila = page.getByRole('listitem').filter({ hasText: 'Balance anual' })
  await fila.getByRole('button', { name: 'Hecho' }).click()
  await expect(page.getByRole('button', { name: 'Hecho' })).toHaveCount(3)
  await expect(page.getByRole('status')).toContainText('Marcado como hecho')
  await page.reload()
  await expect(page.getByText('Balance anual')).toHaveCount(0)
})

test('agregar vencimiento con aviso de 1 semana', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  await expect(page.getByText('No hay vencimientos')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar vencimiento' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Título').fill('Renovar libreta')
  await hoja.getByRole('button', { name: 'Personal' }).click()
  await hoja.getByLabel('Fecha').fill('2026-11-29')
  await hoja.getByRole('button', { name: '1 semana' }).click()
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const fila = page.getByRole('region', { name: 'Personales' }).getByRole('listitem').filter({ hasText: 'Renovar libreta' })
  await expect(fila).toContainText('29 de noviembre de 2026')
  await expect(fila).toContainText('En 7 días')
  await expect(fila).toContainText('Urgente')
})

test('agregar con fecha vacía muestra error', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  await page.getByRole('button', { name: 'Agregar vencimiento' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Título').fill('Algo')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja.getByRole('alert')).toBeVisible()
})

test('familia no entra', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos })
  await entrarComo(page, 'familia')
  await page.goto('/vencimientos')
  await expect(page).not.toHaveURL(/vencimientos/)
  await expect(page.getByText('Patente camioneta')).toHaveCount(0)
})
