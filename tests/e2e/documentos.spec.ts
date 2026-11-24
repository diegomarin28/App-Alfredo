import { test, expect } from '@playwright/test'
import path from 'node:path'
import { entrarComo, hidratado, resetear } from './helpers'
import { hoyMontevideo } from '../../src/domain/fechas'
import { MESES } from '../../src/domain/validarFecha'

const FOTO = path.join(__dirname, 'fixtures', 'foto.jpg')

test.beforeEach(async ({ page }) => {
  await resetear(page, { hoy: '2026-11-22' })
})

test('owner: carpetas sugeridas, crea carpeta con descripción, sube documento (foto primero) y lo abre', async ({ page }) => {
  await entrarComo(page, 'owner')
  await page.goto('/documentos')
  // las 6 sugeridas de arranque, con lo que va adentro
  await expect(page.getByRole('link', { name: /^Personales/ })).toContainText('Cédula, pasaporte, carné')
  await expect(page.getByRole('link', { name: /^Salud/ })).toContainText('Carné, estudios')
  const nueva = page.getByRole('button', { name: 'Nueva carpeta' })
  await hidratado(nueva)
  await nueva.click()
  await page.getByLabel('Nombre').fill('Barco')
  await page.getByLabel('Qué va adentro (opcional)').fill('Papeles del barco')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('link', { name: /^Barco/ })).toContainText('Papeles del barco')
  // duplicado
  await nueva.click()
  await page.getByLabel('Nombre').fill('barco')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Ya existe una carpeta con ese nombre')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('link', { name: /^Barco/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Barco')
  await expect(page.getByText('0 documentos')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Documentos' })).toHaveAttribute('href', '/documentos')
  const mas = page.getByRole('button', { name: 'Agregar documento' })
  await hidratado(mas)
  await mas.click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo documento' })
  // primero la foto (cámara o galería); después el título
  await expect(hoja.getByLabel('Título')).toHaveCount(0)
  await hoja.locator('input[type=file]:not([capture])').setInputFiles(FOTO)
  await expect(hoja.getByText('Foto lista')).toBeVisible()
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja.getByRole('alert')).toHaveText('Poné un título.')
  await hoja.getByLabel('Título').fill('Póliza auto')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('1 documento')).toBeVisible()
  // la fecha de subida es la real (creadoEn), no el "hoy" de prueba
  const [, m, d] = hoyMontevideo(new Date()).split('-').map(Number)
  await expect(page.getByText(`${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}`)).toBeVisible()
  const img = page.getByRole('img', { name: 'Póliza auto' })
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: /Abrir Póliza auto/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('carpeta inexistente: página "no encontrada" en castellano', async ({ page }) => {
  await entrarComo(page, 'owner')
  // Con el esqueleto de carga, Next ya empezó a mandar la página cuando ve que la carpeta no existe: responde 200
  // (no 404) con la página de "no encontrada" y la marca para que no se indexe.
  await page.goto('/documentos/no-existe')
  await expect(page.getByRole('heading', { name: 'No encontramos esa página' })).toBeVisible()
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()
  const volver = page.getByRole('link', { name: 'Volver al inicio' })
  expect((await volver.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await volver.click()
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/$/)
})

test('ruta que no existe: página en castellano', async ({ page }) => {
  await entrarComo(page, 'owner')
  const res = await page.goto('/esto-no-existe')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'No encontramos esa página' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
})

test('fotos: familia sube varias y Alfredo la ve en Inicio; familia no accede a documentos', async ({ page }) => {
  await entrarComo(page, 'familia')
  await page.goto('/fotos')
  await expect(page.getByText('Sacar foto')).toBeVisible()
  await expect(page.getByText('Elegir varias')).toBeVisible()
  await page.locator('input[type=file][multiple]').setInputFiles([FOTO, FOTO])
  await page.getByRole('dialog', { name: 'Subir fotos' }).getByRole('button', { name: 'Subir 2 fotos' }).click()
  await expect(page.getByRole('img', { name: 'Foto familiar' })).toHaveCount(2)
  await expect(page.getByText('2 fotos')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Fotos de la familia/ })).toContainText('2 fotos')
  // Alfredo la ve como foto del día
  await entrarComo(page, 'owner')
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'Foto familiar del día' })).toBeVisible()
  await entrarComo(page, 'familia')

  // documentos: ni página, ni subida, ni lectura
  await page.goto('/documentos')
  await expect(page).toHaveURL(/\/$/)
  const subida = await page.request.post('/api/archivos', {
    multipart: { tipo: 'documento', carpetaId: 'x', titulo: 'T', file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('abc') } },
  })
  expect(subida.status()).toBe(403)
  expect((await page.request.get('/api/archivos/documentos/x/a.jpg')).status()).toBe(403)
})

test('owner: lee documento y foto por la API; rutas inválidas', async ({ page }) => {
  await entrarComo(page, 'owner')
  const r = await page.request.post('/api/archivos', {
    multipart: { tipo: 'foto', file: { name: '../../x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('abc') } },
  })
  expect(r.status()).toBe(200)
  const f = await r.json()
  expect(f.path).toMatch(/^fotos\/[0-9a-f-]+\.jpg$/)
  const g = await page.request.get(`/api/archivos/${f.path}`)
  expect(g.status()).toBe(200)
  expect(g.headers()['content-type']).toBe('image/jpeg')
  expect(g.headers()['cache-control']).toBe('private, max-age=3600')
  expect((await page.request.get('/api/archivos/fotos/nada.jpg')).status()).toBe(404)
  expect((await page.request.get('/api/archivos/fotos/%2e%2e/x')).status()).toBe(400)
  const mal = await page.request.post('/api/archivos', {
    multipart: { tipo: 'foto', file: { name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('abc') } },
  })
  expect(mal.status()).toBe(400)
})
