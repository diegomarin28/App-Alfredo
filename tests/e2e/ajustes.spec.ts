import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'

test('Ajustes sin instalar muestra las instrucciones', async ({ page }) => {
  await resetear(page)
  await entrarComo(page, 'owner')
  await page.goto('/')
  await page.getByRole('link', { name: 'Ajustes' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Avisos' })).toBeVisible()
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
