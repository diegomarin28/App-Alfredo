import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'
import { ENTORNO_E2E } from './entorno'

test('Ajustes sin instalar muestra las instrucciones', async ({ page }) => {
  await resetear(page)
  await entrarComo(page, 'owner')
  await page.goto('/')
  await page.getByRole('link', { name: 'Ajustes' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
  await expect(page.getByText('Avisos', { exact: true })).toBeVisible()
  await expect(page.getByText('Compartir › Agregar a inicio')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Activar avisos' })).toHaveCount(0)
})

test('familia no ve el link y /ajustes la redirige', async ({ page }) => {
  await resetear(page)
  await entrarComo(page, 'familia')
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Ajustes' })).toHaveCount(0)
  await page.goto('/ajustes')
  await expect(page).not.toHaveURL(/ajustes/)
})

test('Ajustes: cómo te saludan y cómo escribís con un solo Guardar; se guarda y se usa', async ({ page }) => {
  await resetear(page, { config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  await page.goto('/ajustes')
  await expect(page.getByRole('link', { name: 'Inicio' }).first()).toHaveAttribute('href', '/')
  const nombre = page.getByLabel('Cómo te saludan')
  const estilo = page.getByLabel('Cómo escribís')
  const guardar = page.getByRole('button', { name: 'Guardar', exact: true })
  await expect(nombre).toHaveValue('Alfredo')
  await expect(page.getByText(/3 o 4 mensajes/)).toBeVisible()
  await nombre.fill('   ')
  await guardar.click()
  await expect(page.getByRole('alert').filter({ hasText: 'Escribí cómo querés que te saluden.' })).toBeVisible()
  await nombre.fill('Alfre')
  await estilo.fill('x'.repeat(4001))
  await guardar.click()
  await expect(page.getByRole('alert').filter({ hasText: 'máximo 4000' })).toBeVisible()
  await estilo.fill('Escribo corto y digo "dale".')
  await guardar.click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Cómo te saludan')).toHaveValue('Alfre')
  await expect(page.getByLabel('Cómo escribís')).toHaveValue('Escribo corto y digo "dale".')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfre')
})

test('Ajustes: el owner no ve el link de la familia ni su código', async ({ page }) => {
  await resetear(page)
  await entrarComo(page, 'owner')
  await page.goto('/ajustes')
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Link para la familia' })).toHaveCount(0)
  const html = await page.content()
  expect(html).not.toContain(ENTORNO_E2E.FAMILY_CODE)
  expect(html).not.toContain('/familia?codigo=')
})

test('Ajustes: Salir cierra la sesión y vuelve a Entrar', async ({ page }) => {
  await resetear(page)
  await entrarComo(page, 'owner')
  await page.goto('/ajustes')
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/entrar/)
  await page.goto('/ajustes')
  await expect(page).toHaveURL(/\/entrar/)
})
