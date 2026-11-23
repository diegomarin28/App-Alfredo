import { test, expect } from '@playwright/test'
import path from 'node:path'
import { entrarComo, resetear } from './helpers'

const FOTO = path.join(__dirname, 'fixtures', 'foto.jpg')

test.beforeEach(async ({ page }) => {
  await resetear(page, { hoy: '2026-11-22' })
})

test('owner: crea carpeta, sube documento con título, lo abre', async ({ page }) => {
  await entrarComo(page, 'owner')
  await page.goto('/documentos')
  await expect(page.getByRole('link', { name: 'Seguros' })).toBeVisible()
  await page.getByRole('button', { name: 'Nueva carpeta' }).click()
  await page.getByLabel('Nombre').fill('Barco')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('link', { name: 'Barco' })).toBeVisible()
  // duplicado
  await page.getByRole('button', { name: 'Nueva carpeta' }).click()
  await page.getByLabel('Nombre').fill('barco')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Ya existe una carpeta con ese nombre')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('link', { name: 'Barco' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Barco')
  // sin título
  await page.locator('input[type=file]').first().setInputFiles(FOTO)
  await expect(page.getByText('Poné un título')).toBeVisible()
  await page.getByLabel('Título').fill('Póliza auto')
  await page.locator('input[type=file]').first().setInputFiles(FOTO)
  await expect(page.getByText('Póliza auto')).toBeVisible()
  await expect(page.getByText('22 de noviembre de 2026')).toBeVisible()
  const img = page.getByRole('img', { name: 'Póliza auto' })
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: /Abrir Póliza auto/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('carpeta inexistente: 404 con la página en castellano', async ({ page }) => {
  await entrarComo(page, 'owner')
  const res = await page.goto('/documentos/no-existe')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'No encontramos esa página' })).toBeVisible()
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

test('fotos: familia sube y Inicio la usa; no accede a documentos', async ({ page }) => {
  await entrarComo(page, 'familia')
  await page.goto('/fotos')
  await expect(page.getByText('Sacar foto')).toBeVisible()
  await expect(page.getByText('Elegir de la galería')).toBeVisible()
  await page.locator('input[type=file]:not([capture])').setInputFiles(FOTO)
  await expect(page.getByRole('img', { name: 'Foto familiar' })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'Foto familiar del día' })).toBeVisible()

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
