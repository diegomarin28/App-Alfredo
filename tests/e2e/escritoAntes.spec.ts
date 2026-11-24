import { test, expect, type Locator, type Page } from '@playwright/test'
import { hidratado, entrarComo, resetear, retenerJavaScript } from './helpers'

// Lo que Alfredo escribe antes de que termine de cargar la página (teléfono lento) no se pierde: al enganchar
// React, el formulario usa lo que ya está escrito en cada campo. (Pendientes, notas, documentos y el saludo se
// escriben en hojas que se abren con la página ya cargada; el buscador de contactos tiene su prueba en contactos.)

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

test('Ajustes: se guarda el nombre y cómo escribís escritos antes de cargar', async ({ page }) => {
  await resetear(page, { config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  const nombre = page.getByLabel('Cómo te saludan')
  const estilo = page.getByLabel('Cómo escribís')
  await escribirAntesDeCargar(page, '/ajustes', [[nombre, 'Alfre'], [estilo, 'Escribo corto y sin vueltas.']])
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible()
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
