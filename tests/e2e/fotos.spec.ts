import path from 'node:path'
import { test, expect, type Page, type Locator } from '@playwright/test'
import { entrarComo, hidratado, resetear } from './helpers'

const HOY = '2026-11-22'
const FOTO = path.join(__dirname, 'fixtures', 'foto.jpg') // 800×600: en el marco 16:9 sobra alto

/** Arrastra con el mouse (eventos de puntero) desde el centro de `zona`. */
async function arrastrar(page: Page, zona: Locator, dx: number, dy: number) {
  const c = (await zona.boundingBox())!
  const x = c.x + c.width / 2, y = c.y + c.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) await page.mouse.move(x + (dx * i) / 6, y + (dy * i) / 6)
  await page.mouse.up()
}

for (const rol of ['owner', 'familia'] as const) {
  test(`${rol}: subir con vista previa: el marco de Inicio, encuadrar arrastrando, Quitar y "Subir N fotos"`, async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, rol)
    await page.goto('/fotos')
    await hidratado(page.getByText('Elegir varias'))
    await page.locator('input[type=file][multiple]').setInputFiles([FOTO, FOTO, FOTO])
    const hoja = page.getByRole('dialog', { name: 'Subir fotos' })
    const marcos = hoja.getByRole('img', { name: /arrastrala para encuadrar/ })
    await expect(marcos).toHaveCount(3)
    // el marco es 16:9, como la foto del día
    const caja = (await marcos.first().boundingBox())!
    expect(caja.width / caja.height).toBeCloseTo(16 / 9, 1)
    await expect(hoja.getByRole('button', { name: 'Subir 3 fotos' })).toBeVisible()

    await hoja.getByRole('button', { name: 'Quitar' }).nth(2).click()
    await expect(marcos).toHaveCount(2)
    await expect(hoja.getByRole('button', { name: 'Subir 2 fotos' })).toBeVisible()

    // arrastrar hacia abajo muestra más de arriba: el foco sube (y < 0,5)
    const primera = marcos.first()
    await arrastrar(page, primera, 0, 60)
    const pos = await primera.locator('img').evaluate((el) => (el as HTMLImageElement).style.objectPosition)
    expect(pos.startsWith('50%')).toBe(true)
    expect(parseFloat(pos.split(' ')[1])).toBeLessThan(50)

    await hoja.getByRole('button', { name: 'Subir 2 fotos' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'Foto familiar' })).toHaveCount(2)
    await expect(page.getByText('2 fotos')).toBeVisible()
    // el encuadre se guardó y se usa en la grilla (object-position)
    const posiciones = await page.getByRole('img', { name: 'Foto familiar' }).evaluateAll((els) => els.map((e) => (e as HTMLImageElement).style.objectPosition))
    expect(posiciones.some((p) => parseFloat(p.split(' ')[1]) < 50)).toBe(true)
  })
}

test('Inicio usa el encuadre guardado (object-position) en la foto del día', async ({ page }) => {
  await resetear(page, { datos: { fotos: [{ path: 'fotos/a.jpg', focoX: 0.25, focoY: 0.1 }] }, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/')
  const img = page.getByRole('img', { name: 'Foto familiar del día' })
  expect(await img.evaluate((el) => (el as HTMLImageElement).style.objectPosition)).toBe('25% 10%')
  await expect(page.getByRole('link', { name: 'Foto familiar del día' })).toContainText('Ver todas')
})

test('foto grande: "2 de 3", deslizar para pasar, cerrar con × o deslizando hacia abajo, Borrar abajo', async ({ page }) => {
  await resetear(page, { datos: { fotos: [{ path: 'fotos/a.jpg' }, { path: 'fotos/b.jpg' }, { path: 'fotos/c.jpg' }] }, hoy: HOY })
  await entrarComo(page, 'owner')
  await page.goto('/fotos')
  const ver = page.getByRole('button', { name: 'Ver foto' })
  await hidratado(ver.first())
  await ver.nth(1).click()
  const visor = page.getByRole('dialog', { name: 'Foto' })
  await expect(visor.getByText('2 de 3')).toBeVisible()
  const zona = visor.getByRole('img', { name: /Foto \d de 3/ })

  await arrastrar(page, visor.locator('div.touch-none'), -150, 0)
  await expect(visor.getByText('3 de 3')).toBeVisible()
  await expect(zona).toHaveAccessibleName('Foto 3 de 3')
  // en la última no pasa de largo
  await arrastrar(page, visor.locator('div.touch-none'), -150, 0)
  await expect(visor.getByText('3 de 3')).toBeVisible()
  await arrastrar(page, visor.locator('div.touch-none'), 150, 0)
  await expect(visor.getByText('2 de 3')).toBeVisible()

  // Borrar abajo
  const borrar = visor.getByRole('button', { name: 'Borrar foto' })
  const cb = (await borrar.boundingBox())!, cv = (await visor.boundingBox())!
  expect(cb.y).toBeGreaterThan(cv.y + cv.height * 0.75)

  await visor.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await ver.first().click()
  await expect(visor.getByText('1 de 3')).toBeVisible()
  await arrastrar(page, visor.locator('div.touch-none'), 0, 200)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
