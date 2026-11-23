import { test, expect, type Page } from '@playwright/test'
import { entrarComo, registrarFaceId, resetear } from './helpers'

// El autenticador virtual de Chromium no da PRF: se prueba el camino del PIN.
const PIN = '482915'
const SECRETO = 'Plata-Secreta-2026!'

const b64 = (n: number) => Buffer.from(new Uint8Array(n).fill(9)).toString('base64')

/** Guarda el cuerpo de cada pedido y respuesta a /api/claves*. */
function espiarRed(page: Page) {
  const cuerpos: string[] = []
  const pendientes: Promise<void>[] = []
  page.on('request', (req) => {
    if (!new URL(req.url()).pathname.startsWith('/api/claves')) return
    cuerpos.push(`${req.method()} ${req.url()} ${req.postData() ?? ''}`)
  })
  page.on('response', (res) => {
    if (!new URL(res.url()).pathname.startsWith('/api/claves')) return
    pendientes.push(res.text().then((t) => { cuerpos.push(t) }, () => {}))
  })
  return async () => {
    await Promise.all(pendientes)
    return cuerpos
  }
}

const desbloquear = (page: Page) => page.getByRole('button', { name: 'Desbloquear con Face ID' })

async function elegirPin(page: Page) {
  await desbloquear(page).click()
  await page.getByLabel('Elegí un PIN de 6 números').fill(PIN)
  await page.getByRole('button', { name: 'Seguir' }).click()
  await page.getByLabel('Repetilo').fill(PIN)
  await page.getByRole('button', { name: 'Guardar PIN' }).click()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
}

async function abrirConPin(page: Page, pin = PIN) {
  await desbloquear(page).click()
  await page.getByLabel('Escribí tu PIN').fill(pin)
  await page.getByRole('button', { name: 'Abrir' }).click()
}

async function agregar(page: Page, sitio: string, usuario: string, clave: string) {
  await page.getByLabel('Sitio').fill(sitio)
  await page.getByLabel('Usuario').fill(usuario)
  await page.getByLabel('Contraseña', { exact: true }).fill(clave)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: sitio })).toBeVisible()
}

test.beforeEach(async ({ request }) => {
  await resetear(request)
})

test('bloqueada → Face ID + PIN nuevo → agregar Banco → copiar; el servidor nunca ve la contraseña', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3100' })
  const red = espiarRed(page)
  await registrarFaceId(page)
  await page.goto('/claves')

  await expect(page.getByRole('heading', { level: 1, name: 'Contraseñas' })).toBeVisible()
  const boton = desbloquear(page)
  await expect(boton).toBeVisible()
  expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await expect(page.getByRole('button', { name: 'Agregar contraseña' })).toHaveCount(0)

  // PIN distinto al repetirlo: no guarda nada.
  await boton.click()
  await page.getByLabel('Elegí un PIN de 6 números').fill(PIN)
  await page.getByRole('button', { name: 'Seguir' }).click()
  await page.getByLabel('Repetilo').fill('000000')
  await page.getByRole('button', { name: 'Guardar PIN' }).click()
  await expect(page.getByText('Los PIN no coinciden')).toBeVisible()
  await page.getByLabel('Elegí un PIN de 6 números').fill(PIN)
  await page.getByRole('button', { name: 'Seguir' }).click()
  await page.getByLabel('Repetilo').fill(PIN)
  await page.getByRole('button', { name: 'Guardar PIN' }).click()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()

  await agregar(page, 'Banco', 'alfredo', SECRETO)
  const item = page.getByRole('listitem').filter({ hasText: 'Banco' })
  await expect(item).toContainText('alfredo')
  await expect(item).toContainText('••••••••')
  await expect(page.getByText(SECRETO)).toHaveCount(0)

  await item.getByRole('button', { name: 'Mostrar' }).click()
  await expect(item).toContainText(SECRETO)
  await item.getByRole('button', { name: 'Ocultar' }).click()
  await expect(item).not.toContainText(SECRETO)

  await item.getByRole('button', { name: 'Copiar' }).click()
  await expect(item.getByText('Copiada')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(SECRETO)

  // Nada queda guardado en el navegador.
  const guardado = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))
  expect(guardado).not.toContain(SECRETO)
  expect(guardado).not.toContain(PIN)

  await page.reload()
  await expect(desbloquear(page)).toBeVisible()
  await expect(page.getByText('Banco')).toHaveCount(0)

  // Se vuelve a abrir con el mismo PIN y descifra.
  await abrirConPin(page)
  const deNuevo = page.getByRole('listitem').filter({ hasText: 'Banco' })
  await deNuevo.getByRole('button', { name: 'Mostrar' }).click()
  await expect(deNuevo).toContainText(SECRETO)

  await page.getByRole('button', { name: 'Bloquear', exact: true }).click()
  await expect(desbloquear(page)).toBeVisible()
  await expect(page.getByText(SECRETO)).toHaveCount(0)

  const cuerpos = await red()
  expect(cuerpos.some((c) => c.includes('POST') && c.includes('/api/claves/config'))).toBe(true)
  expect(cuerpos.some((c) => c.includes('POST') && /\/api\/claves(\?|\s)/.test(c))).toBe(true)
  for (const c of cuerpos) {
    expect(c).not.toContain(SECRETO)
    expect(c).not.toContain(PIN)
  }

  const api = await (await page.request.get('/api/claves')).json()
  expect(api).toEqual([{ id: expect.any(String), sitio: 'Banco', usuario: 'alfredo', cifrado: expect.any(String), iv: expect.any(String) }])
})

test('con PRF (iPhone): Face ID solo abre, sin PIN, y la clave es la misma al volver', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  const red = espiarRed(page)
  await registrarFaceId(page, { prf: true })
  await page.goto('/claves')
  await desbloquear(page).click()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
  await expect(page.getByLabel(/PIN/)).toHaveCount(0)
  await agregar(page, 'Banco', 'alfredo', SECRETO)
  await page.reload()
  await desbloquear(page).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Banco' })
  await item.getByRole('button', { name: 'Mostrar' }).click()
  await expect(item).toContainText(SECRETO)
  expect(await (await page.request.get('/api/claves/config')).json()).toMatchObject({ claveModo: 'prf' })
  for (const c of await red()) expect(c).not.toContain(SECRETO)
})

test('modo PRF en un celular sin PRF: avisa y no toca nada', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await registrarFaceId(page)
  const config = { claveSalt: b64(32), claveModo: 'prf', claveCheck: b64(18), claveCheckIv: b64(12) }
  expect((await page.request.post('/api/claves/config', { data: config })).status()).toBe(200)
  await page.goto('/claves')
  await desbloquear(page).click()
  await expect(page.getByText('Este celular no puede abrir las contraseñas con Face ID.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toHaveCount(0)
  await expect(page.getByLabel(/PIN/)).toHaveCount(0)
  expect(await (await page.request.get('/api/claves/config')).json()).toEqual(config)
})

/** Simula que la app pasa a segundo plano. Sin evento: como si el aviso se hubiera perdido durante Face ID. */
async function ocultar(page: Page, { evento = true } = {}) {
  await page.evaluate((conEvento) => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    if (conEvento) document.dispatchEvent(new Event('visibilitychange'))
  }, evento)
}
const mostrarApp = (page: Page) =>
  page.evaluate(() => Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }))

test('si la app se oculta después de Face ID y antes de abrir, queda bloqueada', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await registrarFaceId(page, { prf: true })
  await page.goto('/claves')
  let alCargar: ((p: Page) => Promise<void>) | null = (p) => ocultar(p)
  await page.route('**/api/claves', async (route) => {
    if (route.request().method() === 'GET' && alCargar) {
      const f = alCargar
      alCargar = null
      await f(page)
    }
    await route.continue()
  })
  const lista = () => page.waitForResponse((r) => new URL(r.url()).pathname === '/api/claves' && r.request().method() === 'GET')

  // 1) Llega el evento "oculta" mientras se carga la lista (después de Face ID).
  let cargada = lista()
  await desbloquear(page).click()
  await cargada
  await expect(desbloquear(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toHaveCount(0)
  await mostrarApp(page)

  // 2) La app sigue oculta cuando llega la lista, sin evento (se perdió durante Face ID).
  alCargar = (p) => ocultar(p, { evento: false })
  cargada = lista()
  await desbloquear(page).click()
  await cargada
  await expect(desbloquear(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toHaveCount(0)
  await mostrarApp(page)

  // 3) Visible: abre normal.
  await desbloquear(page).click()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
})

test('bloquear mientras se descifra no deja el texto a la vista ni en el portapapeles', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3100' })
  // Descifrado lento a pedido, para poder bloquear en el medio.
  await page.addInitScript(() => {
    const original = SubtleCrypto.prototype.decrypt
    SubtleCrypto.prototype.decrypt = function (this: SubtleCrypto, ...a: Parameters<SubtleCrypto['decrypt']>) {
      const p = original.apply(this, a)
      return (window as unknown as { __lento?: boolean }).__lento
        ? p.then((r) => new Promise<ArrayBuffer>((ok) => setTimeout(() => ok(r), 1500)))
        : p
    }
  })
  const lento = (v: boolean) => page.evaluate((x) => { (window as unknown as { __lento?: boolean }).__lento = x }, v)
  await registrarFaceId(page)
  await page.goto('/claves')
  await elegirPin(page)
  await agregar(page, 'Banco', 'alfredo', SECRETO)
  await page.evaluate(() => navigator.clipboard.writeText('nada'))

  await lento(true)
  await page.getByRole('listitem').filter({ hasText: 'Banco' }).getByRole('button', { name: 'Mostrar' }).click()
  await page.getByRole('button', { name: 'Bloquear', exact: true }).click()
  await page.waitForTimeout(2000)
  await lento(false)
  await abrirConPin(page)
  const item = page.getByRole('listitem').filter({ hasText: 'Banco' })
  await expect(item).toContainText('••••••••')
  await expect(item).not.toContainText(SECRETO)

  await lento(true)
  await item.getByRole('button', { name: 'Copiar' }).click()
  await page.getByRole('button', { name: 'Bloquear', exact: true }).click()
  await page.waitForTimeout(2000)
  await lento(false)
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('nada')
})

test('PIN equivocado → "PIN incorrecto" y sigue bloqueada', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await registrarFaceId(page)
  await page.goto('/claves')
  await elegirPin(page)
  await agregar(page, 'Banco', 'alfredo', SECRETO)
  await page.reload()

  await abrirConPin(page, '111111')
  await expect(page.getByText('PIN incorrecto')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toHaveCount(0)
  await expect(page.getByText('Banco')).toHaveCount(0)

  await page.getByLabel('Escribí tu PIN').fill(PIN)
  await page.getByRole('button', { name: 'Abrir' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Banco' })).toBeVisible()
})

test('borrar pide confirmación', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await registrarFaceId(page)
  await page.goto('/claves')
  await elegirPin(page)
  await agregar(page, 'Banco', 'alfredo', SECRETO)
  await agregar(page, 'Mail', '', 'otra-clave')

  const banco = page.getByRole('listitem').filter({ hasText: 'Banco' })
  await banco.getByRole('button', { name: 'Borrar' }).click()
  await banco.getByRole('button', { name: 'No' }).click()
  await expect(banco).toBeVisible()
  await banco.getByRole('button', { name: 'Borrar' }).click()
  await banco.getByRole('button', { name: 'Sí, borrar' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Banco' })).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Mail' })).toBeVisible()
  const api = await (await page.request.get('/api/claves')).json()
  expect(api.map((c: { sitio: string }) => c.sitio)).toEqual(['Mail'])
})

test('se bloquea al ocultar la app y a los 2 minutos sin tocar nada', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Face ID virtual: solo Chromium (CDP)')
  await page.clock.install()
  await registrarFaceId(page)
  await page.goto('/claves')
  await elegirPin(page)

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })
  await expect(desbloquear(page)).toBeVisible()

  await abrirConPin(page)
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
  await page.clock.fastForward(100_000)
  await page.getByRole('heading', { level: 1 }).click()
  await page.clock.fastForward(100_000)
  await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible()
  await page.clock.fastForward(25_000)
  await expect(desbloquear(page)).toBeVisible()
})

test('API: solo guarda cifrado válido; la configuración se fija una sola vez', async ({ page }) => {
  await entrarComo(page, 'owner')
  const r = page.request
  expect((await r.get('/api/claves/config')).status()).toBe(200)
  expect(await (await r.get('/api/claves/config')).json()).toEqual({})

  const mal = await r.post('/api/claves', { data: { sitio: 'Banco', cifrado: 'mi clave', iv: b64(12) } })
  expect(mal.status()).toBe(400)
  expect((await r.post('/api/claves', { data: { sitio: 'Banco', cifrado: b64(30), iv: b64(8) } })).status()).toBe(400)

  const config = { claveSalt: b64(32), claveModo: 'pin', claveCheck: b64(18), claveCheckIv: b64(12) }
  expect((await r.post('/api/claves/config', { data: { ...config, claveModo: 'nada' } })).status()).toBe(400)
  expect((await r.post('/api/claves/config', { data: config })).status()).toBe(200)
  expect(await (await r.get('/api/claves/config')).json()).toEqual(config)
  expect((await r.post('/api/claves/config', { data: { ...config, claveModo: 'prf' } })).status()).toBe(409)

  const ok = await r.post('/api/claves', { data: { sitio: 'Banco', cifrado: b64(30), iv: b64(12), texto: 'plano' } })
  expect(ok.status()).toBe(200)
  const creada = await ok.json()
  expect(creada).toEqual({ id: expect.any(String), sitio: 'Banco', cifrado: b64(30), iv: b64(12) })
  expect((await r.delete(`/api/claves?id=${creada.id}`)).status()).toBe(200)
  expect(await (await r.get('/api/claves')).json()).toEqual([])
})

test('con contraseñas ya guardadas no se puede volver a configurar', async ({ page }) => {
  await resetear(page, { datos: { claves: [{ sitio: 'Banco', cifrado: b64(30), iv: b64(12) }] } })
  await entrarComo(page, 'owner')
  const config = { claveSalt: b64(32), claveModo: 'pin', claveCheck: b64(18), claveCheckIv: b64(12) }
  expect((await page.request.post('/api/claves/config', { data: config })).status()).toBe(409)
  expect(await (await page.request.get('/api/claves/config')).json()).toEqual({})
})

test('familia no entra a Contraseñas ni a sus APIs', async ({ page }) => {
  await entrarComo(page, 'familia')
  await page.goto('/claves')
  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/$/)
  for (const url of ['/api/claves', '/api/claves/config']) {
    expect((await page.request.get(url)).status(), url).toBe(403)
  }
  expect((await page.request.post('/api/claves', { data: {} })).status()).toBe(403)
})
