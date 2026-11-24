import { test, expect } from '@playwright/test'
import { entrarComo, hidratado, resetear, retenerJavaScript } from './helpers'

// Grupos que armó Alfredo (mockup v2: sin categorías fijas).
const datos = {
  gruposContacto: [{ id: 'g-obra', nombre: 'Obra', orden: 1 }, { id: 'g-familia', nombre: 'Familia', orden: 2 }],
  contactos: [
    { nombre: 'Martín Pérez', grupoId: 'g-obra', empresa: 'Ferretería Sur', telefono: '59899123456', nota: 'Paga a 30 días' },
    { nombre: 'Lucía Gómez', grupoId: 'g-obra', empresa: 'Aberturas Gómez' },
    { nombre: 'Dr. Silva', telefono: '59829001234' },
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

test('filtros por grupo, y el grupo junto a la empresa', async ({ page }) => {
  const filtros = page.getByRole('group', { name: 'Filtrar por grupo' })
  await expect(filtros.getByRole('button')).toHaveText(['Todos', 'Obra', 'Familia', 'Grupo'])
  await expect(page.getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('listitem').filter({ hasText: 'Martín Pérez' })).toContainText('Ferretería Sur · Obra')
  await filtros.getByRole('button', { name: 'Obra' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await filtros.getByRole('button', { name: 'Familia' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No hay contactos que coincidan.')).toBeVisible()
  await filtros.getByRole('button', { name: 'Todos' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(3)
})

test('"+ Grupo" crea un grupo nuevo (sin repetir) y se puede elegir al agregar un contacto', async ({ page }) => {
  const filtros = page.getByRole('group', { name: 'Filtrar por grupo' })
  await hidratado(filtros.getByRole('button', { name: 'Grupo' }))
  await filtros.getByRole('button', { name: 'Grupo' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo grupo' })
  await hoja.getByLabel('Nombre del grupo').fill('obra')
  await hoja.getByRole('button', { name: 'Crear grupo' }).click()
  await expect(hoja.getByRole('alert')).toHaveText('Ya hay un grupo con ese nombre.')
  await hoja.getByLabel('Nombre del grupo').fill('Casas')
  await hoja.getByRole('button', { name: 'Crear grupo' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(filtros.getByRole('button')).toHaveText(['Todos', 'Obra', 'Familia', 'Casas', 'Grupo'])

  await page.getByRole('button', { name: 'Agregar contacto' }).click()
  const nuevo = page.getByRole('dialog', { name: 'Nuevo contacto' })
  await nuevo.getByLabel('Nombre').fill('Simón')
  await nuevo.getByLabel('Grupo (opcional)').selectOption({ label: 'Casas' })
  await nuevo.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await filtros.getByRole('button', { name: 'Casas' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('listitem')).toContainText('Simón')
  await page.reload()
  await expect(page.getByRole('group', { name: 'Filtrar por grupo' }).getByRole('button', { name: 'Casas' })).toBeVisible()
})

test('Llamar y WhatsApp solo con teléfono', async ({ page }) => {
  const con = page.getByRole('listitem').filter({ hasText: 'Martín Pérez' })
  await expect(con).toContainText('Paga a 30 días')
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
