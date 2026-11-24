import { test, expect } from '@playwright/test'
import { entrarComo, hidratado, leerPortapapeles, permitirPortapapeles, resetear } from './helpers'

const datos = {
  personasCasa: [
    { casa: 'portofino', nombre: 'Rosa Díaz', rol: 'Limpieza', detalle: 'Martes y viernes', telefono: '59899123456' },
    { casa: 'portofino', nombre: 'Juan Jardinero', rol: 'Jardín' },
    { casa: 'malibu', nombre: 'Pedro Piscinero', rol: 'Piscina', telefono: '59898765432' },
  ],
  eventosCasa: [
    { casa: 'portofino', que: 'Se cambió el termotanque', cuando: '2026-10-01' },
    { casa: 'portofino', que: 'Pintaron el frente', cuando: '2026-11-20' },
    { casa: 'malibu', que: 'Limpiaron la piscina', cuando: '2026-11-15' },
  ],
  serviciosCasa: [
    { casa: 'portofino', clave: 'DirecTV', valor: 'Cliente 123456' },
    { casa: 'malibu', clave: 'OSE', valor: 'Cuenta 777' },
  ],
}

test.beforeEach(async ({ page }) => {
  await resetear(page, { datos, hoy: '2026-11-22' })
  await entrarComo(page, 'owner')
  await page.goto('/casas')
})

test('por defecto Portofino, con sus datos', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Casas')
  await expect(page.getByRole('navigation', { name: 'Elegir casa' }).getByRole('link', { name: 'Portofino' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Rosa Díaz')).toBeVisible()
  await expect(page.getByText('Pedro Piscinero')).toHaveCount(0)
  await expect(page.getByText('Limpiaron la piscina')).toHaveCount(0)
})

test('casa desconocida cae en Portofino', async ({ page }) => {
  await page.goto('/casas?casa=zzz')
  await expect(page.getByRole('navigation', { name: 'Elegir casa' }).getByRole('link', { name: 'Portofino' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Rosa Díaz')).toBeVisible()
})

test('cambiar a Malibú muestra solo Malibú', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Elegir casa' }).getByRole('link', { name: 'Malibú' }).click()
  await expect(page).toHaveURL(/casa=malibu/)
  await expect(page.getByRole('navigation', { name: 'Elegir casa' }).getByRole('link', { name: 'Malibú' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Pedro Piscinero')).toBeVisible()
  await expect(page.getByText('Limpiaron la piscina')).toBeVisible()
  await expect(page.getByText('OSE')).toBeVisible()
  await expect(page.getByText('Rosa Díaz')).toHaveCount(0)
  await expect(page.getByText('DirecTV')).toHaveCount(0)
})

test('Quién se ocupa con botón Llamar', async ({ page }) => {
  const fila = page.getByRole('listitem').filter({ hasText: 'Rosa Díaz' })
  await expect(fila).toContainText('Limpieza · Martes y viernes')
  await expect(fila.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+59899123456')
  const sin = page.getByRole('listitem').filter({ hasText: 'Juan Jardinero' })
  await expect(sin.getByRole('link', { name: 'Llamar' })).toHaveCount(0)
})

test('Historial: más nuevo primero, con fecha en español', async ({ page }) => {
  const items = page.getByRole('region', { name: 'Historial' }).getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Pintaron el frente')
  await expect(items.nth(0)).toContainText('20 de noviembre de 2026')
  await expect(items.nth(1)).toContainText('Se cambió el termotanque')
})

test('Servicios clave y valor, con Copiar', async ({ page, context, browserName }) => {
  await permitirPortapapeles(context, browserName)
  await page.reload() // el espía del portapapeles (WebKit) se instala al cargar
  const f = page.getByRole('listitem').filter({ hasText: 'DirecTV' })
  await expect(f).toContainText('Cliente 123456')
  await hidratado(f.getByRole('button', { name: 'Copiar DirecTV' }))
  await f.getByRole('button', { name: 'Copiar DirecTV' }).click()
  await expect(f.getByRole('button', { name: 'Copiado DirecTV' })).toBeVisible()
  expect(await leerPortapapeles(page)).toBe('Cliente 123456')
})

test('agregar en cada sección persiste', async ({ page }) => {
  await page.getByRole('button', { name: 'Agregar persona' }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Nombre').fill('Ana Plomera')
  await d.getByLabel('Rol').fill('Plomería')
  await d.getByLabel('Teléfono').fill('12')
  await d.getByRole('button', { name: 'Guardar' }).click()
  await expect(d.getByRole('alert')).toHaveText('Revisá el número')
  await d.getByLabel('Teléfono').fill('098 111 222')
  await d.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Ana Plomera' }).getByRole('link', { name: 'Llamar' })).toBeVisible()

  await page.getByRole('button', { name: 'Agregar al historial' }).click()
  const h = page.getByRole('dialog')
  await expect(h.getByLabel('Fecha')).toHaveValue('2026-11-22')
  await h.getByLabel('¿Qué pasó?').fill('Arreglaron la canilla')
  await h.getByRole('button', { name: 'Guardar' }).click()
  const items = page.getByRole('region', { name: 'Historial' }).getByRole('listitem')
  await expect(items.first()).toContainText('Arreglaron la canilla')
  await expect(items.first()).toContainText('22 de noviembre de 2026')

  await page.getByRole('button', { name: 'Agregar servicio' }).click()
  const s = page.getByRole('dialog')
  await s.getByLabel('Servicio').fill('Internet')
  await s.getByLabel('Dato').fill('Línea 555')
  await s.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Internet' })).toContainText('Línea 555')

  await page.reload()
  await expect(page.getByText('Ana Plomera')).toBeVisible()
  await expect(page.getByText('Arreglaron la canilla')).toBeVisible()
  await expect(page.getByText('Línea 555')).toBeVisible()
})

test('secciones vacías muestran una línea', async ({ page }) => {
  await resetear(page, { hoy: '2026-11-22' })
  await page.goto('/casas?casa=malibu')
  await expect(page.getByText('Todavía no hay nadie cargado.')).toBeVisible()
  await expect(page.getByText('Todavía no hay nada en el historial.')).toBeVisible()
  await expect(page.getByText('Todavía no hay servicios cargados.')).toBeVisible()
})

test('familia puede ver y agregar', async ({ page }) => {
  await entrarComo(page, 'familia')
  await page.goto('/casas?casa=malibu')
  await expect(page.getByText('Pedro Piscinero')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar al historial' }).click()
  await page.getByLabel('¿Qué pasó?').fill('Vino la familia')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Vino la familia')).toBeVisible()
})
