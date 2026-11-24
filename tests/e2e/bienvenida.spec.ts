import { test, expect } from '@playwright/test'
import { entrarComo, hidratado, resetear } from './helpers'

// Primera vez (mockup v2): Bienvenida ("¡Feliz cumpleaños, Alfredo!") y Guía de 7 pasos, una sola vez.

const PASOS = [
  'Todo arranca acá', 'Contame y yo lo guardo', 'Cumpleaños y saludos', 'Recordatorios con aviso',
  'Te ayudo a contestar', 'Portofino y Malibú', 'Documentos y contraseñas',
]

test('la primera vez: Bienvenida, Guía con Atrás/Siguiente y Empezar; después no aparece más', async ({ page }) => {
  await resetear(page, { config: { nombre: 'Alfredo', bienvenidaVista: false } })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  await expect(page).toHaveURL(/\/bienvenida$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Feliz cumpleaños, Alfredo!')
  await expect(page.getByText('Con cariño, Pau y Diego')).toBeVisible()
  await page.getByRole('link', { name: 'Ver qué puede hacer' }).click()

  await expect(page).toHaveURL(/\/guia$/)
  const siguiente = page.getByRole('button', { name: 'Siguiente' })
  await hidratado(siguiente)
  await expect(page.getByRole('button', { name: 'Atrás' })).toBeDisabled()
  for (const [i, titulo] of PASOS.entries()) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo)
    await expect(page.getByRole('region', { name: `Paso ${i + 1} de 7` })).toBeVisible()
    if (i < PASOS.length - 1) await siguiente.click()
  }
  await expect(siguiente).toHaveCount(0)
  await page.getByRole('button', { name: 'Atrás' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PASOS[5])
  await siguiente.click()
  await page.getByRole('button', { name: 'Empezar' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  await page.goto('/calendario')
  await expect(page).toHaveURL(/\/calendario$/)
})

test('Saltar también la da por vista; "Ver la guía de nuevo" en Ajustes la vuelve a mostrar', async ({ page }) => {
  await resetear(page, { config: { bienvenidaVista: false } })
  await entrarComo(page, 'owner')
  await page.goto('/guia')
  const saltar = page.getByRole('button', { name: 'Saltar' })
  await hidratado(saltar)
  await saltar.click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/ajustes')
  const ver = page.getByRole('button', { name: 'Ver la guía de nuevo' })
  await hidratado(ver)
  await ver.click()
  await expect(page).toHaveURL(/\/guia$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PASOS[0])
})

test('la familia no ve la Bienvenida', async ({ page }) => {
  await resetear(page, { config: { bienvenidaVista: false } })
  await entrarComo(page, 'familia')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cargando datos para')
  await page.goto('/bienvenida')
  await expect(page).not.toHaveURL(/bienvenida/)
})
