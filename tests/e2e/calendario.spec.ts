import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'
import { waLink } from '../../src/domain/telefono'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

const HOY = '2026-11-22'
const DATOS = {
  fechas: [
    { nombre: 'Ana Pérez', tipo: 'cumple', dia: '11-25', anioNacimiento: 1990 },
    { nombre: 'Luis', tipo: 'aniversario', dia: '12-03' },
    { nombre: 'Marta', tipo: 'cumple', dia: '01-10' },
    { nombre: 'Pedro', tipo: 'otra', dia: '11-30' },
  ],
}

test('próximo cumple destacado y saludo editable', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  const card = page.getByRole('region', { name: 'Próximo cumpleaños' })
  await expect(card).toContainText('Ana Pérez cumple 36')
  await expect(card).toContainText('en 3 días')
  const texto = page.getByRole('textbox', { name: 'Saludo' })
  await expect(texto).toHaveValue('¡Feliz cumple, Ana! Que lo pases bárbaro. Un abrazo grande.')
  await page.getByRole('button', { name: 'Formal' }).click()
  await expect(texto).toHaveValue('Muy feliz cumpleaños, Ana. Te deseo un gran año, con salud y alegría.')
  await page.getByRole('button', { name: 'Corto' }).click()
  await expect(texto).toHaveValue('¡Feliz cumple, Ana! Que se cumplan todos tus deseos.')
  const editado = 'Feliz cumple Ana, nos vemos pronto'
  await texto.fill(editado)
  await expect(page.getByRole('link', { name: 'Enviar por WhatsApp' })).toHaveAttribute('href', waLink(editado))
  await page.getByRole('button', { name: 'Copiar' }).click()
  await expect(page.getByText('Copiado')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(editado)
})

test('lista por mes desde el mes actual y agregar fecha', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  const meses = await page.getByRole('heading', { level: 3 }).allTextContents()
  expect(meses).toEqual(['Noviembre', 'Diciembre', 'Enero'])
  await expect(page.getByRole('link', { name: /Recordatorios del año/ })).toHaveAttribute('href', '/recordatorios')

  await page.getByRole('button', { name: 'Agregar fecha' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Nombre').fill('Sofía')
  await hoja.getByLabel('Día', { exact: true }).selectOption('31')
  await hoja.getByLabel('Mes').selectOption('2')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja.getByText('Febrero no tiene 31 días')).toBeVisible()
  await hoja.getByLabel('Día', { exact: true }).selectOption('14')
  await hoja.getByLabel('Año de nacimiento').fill('2000')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const feb = page.getByRole('region', { name: 'Febrero' })
  await expect(feb).toContainText('Sofía')
  await expect(feb).toContainText('Cumpleaños')
  await expect(feb).toContainText('27 años')
  expect(await page.getByRole('heading', { level: 3 }).allTextContents()).toEqual(['Noviembre', 'Diciembre', 'Enero', 'Febrero'])
})

test('repo vacío: estado vacío sin romper', async ({ page }) => {
  await resetear(page, { sinSeed: true, hoy: HOY })
  await entrarComo(page, 'owner')
  const res = await page.goto('/calendario')
  expect(res?.status()).toBe(200)
  await expect(page.getByText('Todavía no hay fechas cargadas')).toBeVisible()
})

test('familia puede ver y agregar', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'familia')
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Agregar fecha' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Nombre').fill('Tía Rosa')
  await hoja.getByLabel('Día', { exact: true }).selectOption('5')
  await hoja.getByLabel('Mes').selectOption('12')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('region', { name: 'Diciembre' })).toContainText('Tía Rosa')
})
