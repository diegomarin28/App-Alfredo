import { test, expect, type Locator, type Page } from '@playwright/test'
import { entrarComo, hidratado, resetear, retenerJavaScript } from './helpers'
import { waLink } from '../../src/domain/telefono'

// Lo que Alfredo escribe antes de que termine de cargar la página (teléfono lento) no se pierde:
// al enganchar React, el formulario usa lo que ya está escrito en cada campo.

const HOY = '2026-11-22'

async function escribirAntesDeCargar(page: Page, ruta: string, campos: [Locator, string][]) {
  const soltar = await retenerJavaScript(page)
  await page.goto(ruta, { waitUntil: 'domcontentloaded' })
  for (const [campo, texto] of campos) await campo.fill(texto)
  soltar()
  for (const [campo, texto] of campos) {
    await hidratado(campo)
    await expect(campo).toHaveValue(texto)
  }
}

test('pendientes y notas: se guarda lo escrito antes de cargar', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  const pendiente = page.getByLabel('Agregar pendiente')
  const nota = page.getByLabel('Escribir una nota')
  await escribirAntesDeCargar(page, '/pendientes', [[pendiente, 'Llamar al contador'], [nota, 'Idea para el jardín']])
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Por hacer' })).toContainText('Llamar al contador')
  await page.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(page.getByRole('region', { name: 'Notas' })).toContainText('Idea para el jardín')
})

test('Ajustes: se guarda el nombre y cómo escribís escritos antes de cargar', async ({ page }) => {
  await resetear(page, { config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  const nombre = page.getByLabel('Cómo te saludan')
  const estilo = page.getByLabel('Cómo escribís')
  await escribirAntesDeCargar(page, '/ajustes', [[nombre, 'Alfre'], [estilo, 'Escribo corto y sin vueltas.']])
  const guardado = page.getByRole('status').filter({ hasText: 'Guardado' })
  await page.getByRole('button', { name: 'Guardar nombre' }).click()
  await expect(guardado).toHaveCount(1)
  await page.getByRole('button', { name: 'Guardar cómo escribís' }).click()
  await expect(guardado).toHaveCount(2)
  await page.reload()
  await expect(nombre).toHaveValue('Alfre')
  await expect(estilo).toHaveValue('Escribo corto y sin vueltas.')
})

test('configurar: el código escrito antes de cargar habilita Registrar Face ID', async ({ page }) => {
  await resetear(page)
  const codigo = page.getByLabel('Código de configuración')
  await escribirAntesDeCargar(page, '/configurar', [[codigo, 'cualquiera']])
  await expect(page.getByRole('button', { name: 'Registrar Face ID' })).toBeEnabled()
})

test('documentos: el título escrito antes de cargar habilita sacar foto y galería', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/documentos')
  const carpeta = await page.getByRole('link', { name: 'Seguros' }).getAttribute('href')
  const titulo = page.getByLabel('Título')
  await escribirAntesDeCargar(page, carpeta!, [[titulo, 'Póliza auto']])
  await expect(page.getByText('Primero poné un título')).toHaveCount(0)
  for (const entrada of await page.locator('input[type=file]').all()) await expect(entrada).toBeEnabled()
})

test('calendario: el saludo editado antes de cargar es el que se manda por WhatsApp', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { fechas: [{ nombre: 'Ana Pérez', tipo: 'cumple', dia: '11-25', anioNacimiento: 1990 }] } })
  await entrarComo(page, 'owner')
  const editado = 'Feliz cumple Ana, nos vemos pronto'
  await escribirAntesDeCargar(page, '/calendario', [[page.getByRole('textbox', { name: 'Saludo' }), editado]])
  await expect(page.getByRole('link', { name: 'Enviar por WhatsApp' })).toHaveAttribute('href', waLink(editado))
})
