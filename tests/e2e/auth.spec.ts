import { test, expect } from '@playwright/test'
import { ENTORNO_E2E } from './entorno'
import { conFaceIdVirtual, entrarComo, resetear } from './helpers'

const RAIZ = /^http:\/\/localhost:3100\/$/

test.beforeEach(async ({ request }) => {
  await resetear(request)
})

test('sin sesión, Inicio manda a /entrar y las APIs dan 401', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
  await expect(page.getByRole('button', { name: 'Entrar con Face ID' })).toBeVisible()
  await page.goto('/claves')
  await expect(page).toHaveURL(/\/entrar$/)
  const res = await request.get('/api/fechas')
  expect(res.status()).toBe(401)
})

test('con código incorrecto /configurar no registra nada', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await conFaceIdVirtual(page)
  await page.goto('/configurar')
  await page.getByLabel('Código de configuración').fill('cualquiera')
  await page.getByRole('button', { name: 'Registrar Face ID' }).click()
  await expect(page.getByText('El código no es correcto')).toBeVisible()
  await expect(page).toHaveURL(/\/configurar$/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
})

test('registrar Face ID, salir y volver a entrar con Face ID', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await conFaceIdVirtual(page)
  await page.goto('/configurar')
  await page.getByLabel('Código de configuración').fill(ENTORNO_E2E.SETUP_CODE)
  await page.getByRole('button', { name: 'Registrar Face ID' }).click()
  await expect(page).toHaveURL(RAIZ)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')

  const salir = await page.request.post('/api/auth/salir')
  expect(salir.status()).toBe(200)
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)

  const boton = page.getByRole('button', { name: 'Entrar con Face ID' })
  expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await boton.click()
  await expect(page).toHaveURL(RAIZ)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alfredo')
  await page.goto('/claves')
  await expect(page).toHaveURL(/\/claves$/)
})

test('Face ID sin passkey registrada no entra', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await conFaceIdVirtual(page)
  await page.goto('/entrar')
  await page.getByRole('button', { name: 'Entrar con Face ID' }).click()
  await expect(page.getByText(/No se pudo entrar/)).toBeVisible()
  await expect(page).toHaveURL(/\/entrar$/)
})

test('link de familia con código incorrecto queda afuera', async ({ page }) => {
  await page.goto('/familia?codigo=WRONG')
  await expect(page.getByText('Este link ya no sirve')).toBeVisible()
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
  await page.goto('/calendario')
  await expect(page).toHaveURL(/\/entrar$/)
})

test('link de familia correcto: ve calendario, nunca lo prohibido', async ({ page }) => {
  await page.goto(`/familia?codigo=${ENTORNO_E2E.FAMILY_CODE}`)
  await expect(page).toHaveURL(RAIZ)
  await page.goto('/calendario')
  await expect(page).toHaveURL(/\/calendario$/)
  for (const prohibida of ['/claves', '/documentos', '/contactos', '/vencimientos', '/mensajes', '/contame']) {
    await page.goto(prohibida)
    await expect(page, prohibida).toHaveURL(RAIZ)
  }
  const api = await page.request.get('/api/claves')
  expect(api.status()).toBe(403)
  expect(await api.json()).toEqual({ error: expect.any(String) })
})

test('rutas de prueba: entrarComo deja la sesión pedida', async ({ page }) => {
  await entrarComo(page, 'familia')
  await page.goto('/claves')
  await expect(page).toHaveURL(RAIZ)
  await entrarComo(page, 'owner')
  await page.goto('/claves')
  await expect(page).toHaveURL(/\/claves$/)
})

test('primera vez: /entrar muestra el link para configurar Face ID, de al menos 44px', async ({ page }) => {
  await page.goto('/entrar')
  const configurar = page.getByRole('link', { name: 'Configurar Face ID por primera vez' })
  await expect(configurar).toHaveAttribute('href', '/configurar')
  expect((await configurar.boundingBox())!.height).toBeGreaterThanOrEqual(44)
})

test('primera vez: configurar Face ID desde /entrar; después el link ya no aparece', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await page.goto('/entrar')
  const configurar = page.getByRole('link', { name: 'Configurar Face ID por primera vez' })
  await conFaceIdVirtual(page)
  await configurar.click()
  await expect(page).toHaveURL(/\/configurar$/)
  await page.getByLabel('Código de configuración').fill(ENTORNO_E2E.SETUP_CODE)
  await page.getByRole('button', { name: 'Registrar Face ID' }).click()
  await expect(page).toHaveURL(RAIZ)
  await page.request.post('/api/auth/salir')
  await page.goto('/entrar')
  await expect(page.getByRole('button', { name: 'Entrar con Face ID' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Configurar Face ID por primera vez' })).toHaveCount(0)
})

test('con Face ID ya configurado, el SETUP_CODE no sirve sin sesión; el owner sí puede sumar otro', async ({ page, browser, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await conFaceIdVirtual(page)
  await page.goto('/configurar')
  await page.getByLabel('Código de configuración').fill(ENTORNO_E2E.SETUP_CODE)
  await page.getByRole('button', { name: 'Registrar Face ID' }).click()
  await expect(page).toHaveURL(RAIZ)

  // El owner (con sesión) puede pedir opciones para un teléfono nuevo.
  const owner = await page.request.post('/api/auth/registro/opciones', { data: { codigo: ENTORNO_E2E.SETUP_CODE } })
  expect(owner.status()).toBe(200)

  // Otro navegador, sin sesión: aunque tenga el código, no registra.
  const otro = await browser.newContext()
  const extraño = await otro.newPage()
  const api = await extraño.request.post('http://localhost:3100/api/auth/registro/opciones', { data: { codigo: ENTORNO_E2E.SETUP_CODE } })
  expect(api.status()).toBe(403)
  expect((await api.json()).error).toMatch(/Face ID ya está configurado/)
  await extraño.goto('http://localhost:3100/configurar')
  await expect(extraño.getByText('Face ID ya está configurado')).toBeVisible()
  await expect(extraño.getByLabel('Código de configuración')).toHaveCount(0)
  await extraño.getByRole('link', { name: 'Ir a entrar' }).click()
  await expect(extraño).toHaveURL(/\/entrar$/)
  await otro.close()
})
