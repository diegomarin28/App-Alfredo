import { devices, expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { entrarComo, hidratado, resetear } from './helpers'

// Ronda 5, punto 9: "Para completar" en Inicio.
// Con SALIDA=<carpeta> corre como iPhone 15 en WebKit y deja capturas en esa carpeta.
const SALIDA = process.env.SALIDA
if (SALIDA) test.use({ ...devices['iPhone 15'], browserName: 'webkit', viewport: { width: 393, height: 852 } })

const HOY = '2026-11-24'

const A_MEDIAS = {
  fechas: [
    { id: 'f-ariel', nombre: 'Ariel Luz', tipo: 'cumple', dia: null },
    { nombre: 'Ana Pérez', tipo: 'cumple', dia: '11-25' },
  ],
  serviciosCasa: [
    { id: 's-prosegur', casa: 'malibu', clave: 'Prosegur', valor: null },
    { casa: 'portofino', clave: 'DirecTV', valor: 'Cliente 123456' },
  ],
  contactos: [
    { id: 'c-anabel', nombre: 'Anabel', empresa: 'Inmobiliaria' },
    { id: 'c-bruno', nombre: 'Bruno' },
    { nombre: 'Dr. Silva', telefono: '59829001234' },
  ],
}

async function captura(page: Page, nombre: string) {
  if (!SALIDA) return
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`), animations: 'disabled', fullPage: nombre.startsWith('9-inicio') })
}

const tarjeta = (page: Page) => page.getByRole('region', { name: 'Para completar' })
const fila = (page: Page, titulo: string) => tarjeta(page).locator('[data-fila]').filter({ hasText: titulo })

test('aparece debajo de "Lo próximo" con lo que falta; 3 y "Ver todo"', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: A_MEDIAS })
  await entrarComo(page, 'owner')
  await page.goto('/')
  const t = tarjeta(page)
  await expect(t).toBeVisible()
  // debajo de "Lo próximo"
  const proximo = (await page.getByRole('heading', { name: 'Lo próximo' }).boundingBox())!
  expect((await t.boundingBox())!.y).toBeGreaterThan(proximo.y)
  await expect(fila(page, 'Cumple de Ariel Luz')).toContainText('Falta la fecha')
  await expect(fila(page, 'Prosegur')).toContainText('Malibú · falta el número')
  await expect(fila(page, 'Anabel')).toContainText('Falta el teléfono')
  // 4 a medias: se ven 3 y "Ver todo"
  await expect(t.locator('[data-fila]')).toHaveCount(3)
  await captura(page, '9-inicio-para-completar')
  const ver = t.getByRole('button', { name: 'Ver todo (4)' })
  await hidratado(ver)
  await ver.click()
  await expect(t.locator('[data-fila]')).toHaveCount(4)
  await expect(fila(page, 'Bruno')).toBeVisible()
})

test('no aparece si no hay nada a medias', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { fechas: [{ nombre: 'Ana', tipo: 'cumple', dia: '11-25' }], contactos: [{ nombre: 'Dr. Silva', telefono: '59829001234' }] } })
  await entrarComo(page, 'owner')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Lo próximo' })).toBeVisible()
  await expect(tarjeta(page)).toHaveCount(0)
})

test('Omitir lo saca para siempre sin borrarlo', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: A_MEDIAS })
  await entrarComo(page, 'owner')
  await page.goto('/')
  const omitir = tarjeta(page).getByRole('button', { name: 'Omitir: Anabel' })
  await hidratado(omitir)
  // se oculta enseguida; se espera a que el servidor lo guarde antes de recargar
  const guardado = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/'))
  await omitir.click()
  await expect(fila(page, 'Anabel')).toHaveCount(0)
  expect((await guardado).ok()).toBe(true)
  await page.reload()
  await expect(fila(page, 'Cumple de Ariel Luz')).toBeVisible()
  await expect(fila(page, 'Anabel')).toHaveCount(0)
  // el contacto sigue en Contactos
  await page.goto('/contactos')
  await expect(page.getByText('Anabel', { exact: true })).toBeVisible()
})

test('Agregar abre el formulario de cada uno; al completarlo sale de la lista', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: A_MEDIAS })
  await entrarComo(page, 'owner')
  await page.goto('/')

  // cumpleaños: la fecha
  const cumple = tarjeta(page).getByRole('button', { name: 'Agregar: Cumple de Ariel Luz' })
  await hidratado(cumple)
  await cumple.click()
  let hoja = page.getByRole('dialog', { name: 'Fecha del cumpleaños' })
  await expect(hoja.getByLabel('Nombre')).toHaveValue('Ariel Luz')
  await hoja.getByLabel('Día', { exact: true }).selectOption('8')
  await hoja.getByLabel('Mes', { exact: true }).selectOption('12')
  await captura(page, '9-agregar-cumple')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toHaveCount(0)
  await expect(fila(page, 'Cumple de Ariel Luz')).toHaveCount(0)

  // servicio: el número
  await tarjeta(page).getByRole('button', { name: 'Agregar: Prosegur' }).click()
  hoja = page.getByRole('dialog', { name: 'Editar servicio' })
  await expect(hoja.getByLabel('Servicio')).toHaveValue('Prosegur')
  await expect(hoja.getByLabel('Dato')).toBeFocused()
  await hoja.getByLabel('Dato').fill('Abonado 4455')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toHaveCount(0)
  await expect(fila(page, 'Prosegur')).toHaveCount(0)

  // contacto: el teléfono (lo demás queda como estaba)
  await tarjeta(page).getByRole('button', { name: 'Agregar: Anabel' }).click()
  hoja = page.getByRole('dialog', { name: 'Editar contacto' })
  await expect(hoja.getByLabel('Empresa')).toHaveValue('Inmobiliaria')
  await expect(hoja.getByLabel('Teléfono')).toBeFocused()
  await hoja.getByLabel('Teléfono').fill('099 111 222')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toHaveCount(0)
  await expect(fila(page, 'Anabel')).toHaveCount(0)
  await expect(fila(page, 'Bruno')).toBeVisible()

  // quedó guardado donde corresponde
  await page.goto('/calendario')
  await expect(page.locator('[data-fila]').filter({ hasText: 'Ariel Luz' })).toContainText('8')
  await page.goto('/casas?casa=malibu')
  await expect(page.getByText('Abonado 4455')).toBeVisible()
  await page.goto('/contactos')
  await expect(page.locator('[data-fila]').filter({ hasText: 'Anabel' })).toContainText('Inmobiliaria')
})

test('Calendario: un cumpleaños sin fecha no aparece hasta tener fecha', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: A_MEDIAS })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  await expect(page.locator('[data-fila]').filter({ hasText: 'Ana Pérez' })).toBeVisible()
  await expect(page.getByText('Ariel Luz')).toHaveCount(0)
  // en Casas, el servicio sin número dice qué falta
  await page.goto('/casas?casa=malibu')
  await expect(page.locator('[data-fila]').filter({ hasText: 'Prosegur' })).toContainText('Falta el número')
})

test('la familia no ve "Para completar"', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: A_MEDIAS })
  await entrarComo(page, 'familia')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(tarjeta(page)).toHaveCount(0)
})
