import { test, expect } from '@playwright/test'
import { entrarComo, hidratado, resetear, retenerJavaScript } from './helpers'

const datos = {
  contactos: [
    { nombre: 'Martín Pérez', tipo: 'cliente', empresa: 'Ferretería Sur', telefono: '59899123456', nota: 'Paga a 30 días' },
    { nombre: 'Lucía Gómez', tipo: 'proveedor', empresa: 'Aberturas Gómez' },
    { nombre: 'Dr. Silva', tipo: 'otro', telefono: '59829001234' },
  ],
}

test.beforeEach(async ({ page }) => {
  await resetear(page, { datos })
  await entrarComo(page, 'owner')
  await page.goto('/contactos')
})

test('buscador sin mayúsculas ni tildes, por nombre o empresa', async ({ page }) => {
  const buscar = page.getByRole('searchbox', { name: 'Buscar' })
  await buscar.fill('martin')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Martín Pérez')).toBeVisible()
  await buscar.fill('ABERTURAS')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Lucía Gómez')).toBeVisible()
  await buscar.fill('zzz')
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('filtros por tipo', async ({ page }) => {
  await expect(page.getByRole('listitem')).toHaveCount(3)
  await page.getByRole('button', { name: 'Proveedores' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Lucía Gómez')).toBeVisible()
  await page.getByRole('button', { name: 'Clientes' }).click()
  await expect(page.getByText('Martín Pérez')).toBeVisible()
  await page.getByRole('button', { name: 'Otros' }).click()
  await expect(page.getByText('Dr. Silva')).toBeVisible()
  await page.getByRole('button', { name: 'Todos' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(3)
})

test('Llamar y WhatsApp solo con teléfono', async ({ page }) => {
  const con = page.getByRole('listitem').filter({ hasText: 'Martín Pérez' })
  await expect(con).toContainText('Paga a 30 días')
  await expect(con).toContainText('099 123 456')
  await expect(con.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+59899123456')
  await expect(con.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/59899123456/)
  const sin = page.getByRole('listitem').filter({ hasText: 'Lucía Gómez' })
  await expect(sin.getByRole('link', { name: 'Llamar' })).toHaveCount(0)
  await expect(sin.getByRole('link', { name: 'WhatsApp' })).toHaveCount(0)
})

test('agregar contacto y teléfono inválido', async ({ page }) => {
  await page.getByRole('button', { name: 'Agregar contacto' }).click()
  await page.getByLabel('Nombre').fill('Pablo Ruiz')
  await page.getByLabel('Teléfono').fill('123')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Revisá el número')
  await page.getByLabel('Teléfono').fill('098 765 432')
  await page.getByRole('button', { name: 'Guardar' }).click()
  const fila = page.getByRole('listitem').filter({ hasText: 'Pablo Ruiz' })
  await expect(fila.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+59898765432')
  await page.reload()
  await expect(page.getByText('Pablo Ruiz')).toBeVisible()
})

test('lo escrito en el buscador antes de que cargue el JavaScript también filtra', async ({ page }) => {
  // El buscador está (HTML del servidor) pero React todavía no.
  const soltar = await retenerJavaScript(page)
  await page.goto('/contactos', { waitUntil: 'domcontentloaded' })
  const buscar = page.getByRole('searchbox', { name: 'Buscar' })
  await buscar.fill('martin')
  soltar()
  await hidratado(buscar)
  await expect(buscar).toHaveValue('martin')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Martín Pérez')).toBeVisible()
})
