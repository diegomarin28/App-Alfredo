import { test, expect } from '@playwright/test'
import { entrarComo, leerPortapapeles, permitirPortapapeles, resetear } from './helpers'
import { waLink } from '../../src/domain/telefono'

test.beforeEach(async ({ context, browserName }) => {
  await permitirPortapapeles(context, browserName)
})

const HOY = '2026-11-22'
const DATOS = {
  fechas: [
    { nombre: 'Ana Pérez', tipo: 'cumple', dia: '11-25', anioNacimiento: 1990 },
    { nombre: 'Luis', tipo: 'otra', dia: '12-03' },
    { nombre: 'Marta', tipo: 'cumple', dia: '01-10' },
    { nombre: 'Pedro', tipo: 'otra', dia: '11-30' },
  ],
}

test('ronda 5: sin tarjeta destacada del próximo cumple, solo la lista; los otros días sin "Mandar saludo"', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  await expect(page.getByRole('region', { name: 'Cumpleaños de hoy' })).toHaveCount(0)
  await expect(page.getByText('En 3 días')).toHaveCount(0)
  // Ana sigue en la lista, con su edad
  await expect(page.locator('[data-fila]').filter({ hasText: 'Ana Pérez' })).toContainText('36 años')
  await expect(page.getByRole('button', { name: 'Mandar saludo' })).toHaveCount(0)
})

test('el día del cumple: "Mandar saludo" abre el saludo Formal, editable, con tonos Cercano y Breve', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: '2026-11-25', config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  // el 25/11 también es el cumple de Alfredo: el brindis ya se vio hoy (tiene su prueba en detalles)
  await page.addInitScript(() => { try { localStorage.setItem('alfredo:brindis', '2026-11-25') } catch { /* nada */ } })
  await page.goto('/calendario')
  // el día del cumpleaños sí queda la tarjeta, para mandar el saludo
  const card = page.getByRole('region', { name: 'Cumpleaños de hoy' })
  await expect(card).toContainText('Hoy cumple Ana Pérez')
  await card.getByRole('button', { name: 'Mandar saludo' }).click()
  const hoja = page.getByRole('dialog', { name: 'Saludo para Ana' })
  const texto = hoja.getByRole('textbox', { name: 'Saludo' })
  await expect(hoja.getByRole('radio', { name: 'Formal' })).toBeChecked()
  await expect(texto).toHaveValue('Ana, te deseo un muy feliz cumpleaños. Que tengas un lindo día junto a los tuyos. Un fuerte abrazo, Alfredo.')
  await hoja.getByRole('radio', { name: 'Cercano' }).click()
  await expect(texto).toHaveValue('¡Feliz cumpleaños, Ana! Que pases un lindo día con los tuyos. Un abrazo grande, Alfredo.')
  await hoja.getByRole('radio', { name: 'Breve' }).click()
  await expect(texto).toHaveValue('¡Feliz cumpleaños, Ana! Un abrazo, Alfredo.')
  const editado = 'Feliz cumple Ana, nos vemos pronto'
  await texto.fill(editado)
  await expect(hoja.getByRole('link', { name: 'Enviar por WhatsApp' })).toHaveAttribute('href', waLink(editado))
  await hoja.getByRole('button', { name: 'Copiar' }).click()
  await expect(hoja.getByRole('button', { name: 'Copiado' })).toBeVisible()
  expect(await leerPortapapeles(page)).toBe(editado)
  await hoja.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('lista por mes desde el mes actual y agregar fecha', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  const meses = await page.getByRole('heading', { level: 2 }).allTextContents()
  expect(meses).toEqual(['Noviembre', 'Diciembre', 'Enero'])
  await expect(page.getByRole('link', { name: /Recordatorios/ })).toHaveAttribute('href', '/recordatorios')

  await page.getByRole('button', { name: 'Agregar fecha' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Nombre').fill('Sofía')
  await hoja.getByLabel('Día', { exact: true }).selectOption('31')
  await hoja.getByLabel('Mes').selectOption('2')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja.getByText('Febrero no tiene 31 días')).toBeVisible()
  await hoja.getByLabel('Día', { exact: true }).selectOption('14')
  await expect(hoja.getByRole('radio', { name: 'Cumpleaños' })).toBeChecked()
  await hoja.getByLabel('Año de nacimiento (opcional)').fill('2000')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const feb = page.getByRole('region', { name: 'Febrero' })
  await expect(feb).toContainText('Sofía')
  await expect(feb).toContainText('Cumpleaños')
  await expect(feb).toContainText('27 años')
  expect(await page.getByRole('heading', { level: 2 }).allTextContents()).toEqual(['Noviembre', 'Diciembre', 'Enero', 'Febrero'])
})

test('repo vacío: estado vacío sin romper', async ({ page }) => {
  await resetear(page, { sinSeed: true, hoy: HOY })
  await entrarComo(page, 'owner')
  const res = await page.goto('/calendario')
  expect(res?.status()).toBe(200)
  await expect(page.getByText('Todavía no hay fechas cargadas. Tocá el + para sumar la primera.')).toBeVisible()
})

test('familia puede ver y agregar', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'familia')
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Agregar fecha' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Nombre').fill('Tía Rosa')
  await hoja.getByRole('radio', { name: 'Otra' }).click()
  await expect(hoja.getByLabel('Año de nacimiento (opcional)')).toHaveCount(0)
  await expect(hoja.getByLabel('Se repite')).toHaveValue('anual')
  await hoja.getByLabel('Día', { exact: true }).selectOption('5')
  await hoja.getByLabel('Mes').selectOption('12')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('region', { name: 'Diciembre' })).toContainText('Tía Rosa')
  await expect(page.getByRole('region', { name: 'Diciembre' }).getByRole('listitem').filter({ hasText: 'Tía Rosa' })).toContainText('Otra fecha')
})

test('ronda 4b: solo Cumpleaños u Otra; el cumple dice "Se repite todos los años"; Día y Mes en "Elegí"', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Agregar fecha' }).click()
  const hoja = page.getByRole('dialog')
  expect(await hoja.getByRole('radio').allTextContents()).toEqual(['Cumpleaños', 'Otra'])
  await expect(hoja.getByText('Se repite todos los años.')).toBeVisible()
  await expect(hoja.getByLabel('Se repite')).toHaveCount(0)
  await expect(hoja.getByLabel('Día', { exact: true })).toHaveValue('')
  await expect(hoja.getByLabel('Mes')).toHaveValue('')
  await expect(hoja.getByLabel('Día', { exact: true }).locator('option:checked')).toHaveText('Elegí')
})

test('"Otra" que se repite cada semana, con hora: la lista muestra la próxima vez y los días (ronda 5: chips)', async ({ page }) => {
  await resetear(page, { datos: DATOS, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Agregar fecha' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Nombre').fill('Truco en el club')
  await hoja.getByRole('radio', { name: 'Otra' }).click()
  await hoja.getByLabel('Se repite').selectOption('semanal')
  // hoy es domingo 22 (viene marcado); se marca el jueves y se desmarca el domingo → el próximo es el jueves 26
  await hoja.getByRole('checkbox', { name: 'jueves' }).click()
  await hoja.getByRole('checkbox', { name: 'domingo' }).click()
  await hoja.getByLabel('Hora (opcional)').fill('18:30')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const fila = page.getByRole('region', { name: 'Noviembre' }).getByRole('listitem').filter({ hasText: 'Truco en el club' })
  await expect(fila).toContainText('26')
  await expect(fila).toContainText('Otra fecha · jue · 18:30 h')
})

test('ronda 4b: "No se repite" pide el año; una vez que pasó, ya no aparece', async ({ page }) => {
  await resetear(page, { datos: { fechas: [...DATOS.fechas, { nombre: 'Viaje que ya fue', tipo: 'otra', dia: '10-01', anioEvento: 2026, repeticion: 'nunca' }] }, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  await expect(page.getByText('Viaje que ya fue')).toHaveCount(0)
  await page.getByRole('button', { name: 'Agregar fecha' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Nombre').fill('Escribano')
  await hoja.getByRole('radio', { name: 'Otra' }).click()
  await hoja.getByLabel('Se repite').selectOption('nunca')
  await hoja.getByLabel('Día', { exact: true }).selectOption('3')
  await hoja.getByLabel('Mes').selectOption('12')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja.getByText('Elegí el año.')).toBeVisible()
  await hoja.getByLabel('Año', { exact: true }).fill('2026')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Diciembre' }).getByRole('listitem').filter({ hasText: 'Escribano' })).toContainText('Otra fecha')
})
