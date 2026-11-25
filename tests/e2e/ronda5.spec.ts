import { devices, expect, test, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { entrarComo, hidratado, resetear } from './helpers'

// Ronda 5: arreglos de la prueba en iPhone.
// Con SALIDA=<carpeta> corre como iPhone 15 en WebKit y deja una captura de cada punto en esa carpeta.
const SALIDA = process.env.SALIDA
if (SALIDA) test.use({ ...devices['iPhone 15'], browserName: 'webkit', viewport: { width: 393, height: 852 } })

const HOY = '2026-11-24' // martes
const FOTO = readFileSync(path.join(__dirname, 'fixtures', 'foto.jpg'))
/** Alto del teclado del iPhone con la barra de sugerencias. */
const TECLADO = 336

async function captura(page: Page, nombre: string) {
  if (!SALIDA) return
  await page.waitForTimeout(600) // que terminen las animaciones de la hoja
  await page.screenshot({ path: path.join(SALIDA, `${nombre}.png`), animations: 'disabled' })
}

/**
 * Teclado simulado: Playwright no saca el teclado, así que se reemplaza visualViewport por uno que se achica como
 * cuando sale el teclado del iPhone (y se dibuja el teclado, para la captura).
 */
async function tecladoFalso(page: Page) {
  await page.addInitScript(() => {
    const vv = new EventTarget() as EventTarget & Record<string, number>
    Object.assign(vv, { offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1, width: innerWidth, height: innerHeight })
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
    ;(window as unknown as { __teclado: (alto: number) => void }).__teclado = (alto) => {
      vv.height = document.documentElement.clientHeight - alto
      vv.width = innerWidth
      const t = document.getElementById('teclado-falso') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'teclado-falso' }))
      t.textContent = 'teclado'
      t.setAttribute('style', `position:fixed;left:0;right:0;bottom:0;height:${alto}px;background:#d1d4db;z-index:99999;display:flex;align-items:center;justify-content:center;font:600 17px system-ui;color:#6b7078;pointer-events:none`)
      vv.dispatchEvent(new Event('resize'))
    }
  })
}

const abrirTeclado = (page: Page) => page.evaluate((alto) => (window as unknown as { __teclado: (a: number) => void }).__teclado(alto), TECLADO)

async function caja(l: Locator) {
  const b = (await l.boundingBox())!
  return { ...b, abajo: b.y + b.height, derecha: b.x + b.width }
}

test.describe('Volver', () => {
  test('toda pantalla que no es pestaña tiene "‹ Volver" arriba a la izquierda, de 44 px; si se entró directo, va a Inicio', async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    for (const ruta of ['/vencimientos', '/pendientes', '/recordatorios', '/contactos', '/documentos', '/claves', '/fotos', '/ajustes']) {
      await page.goto(ruta)
      const volver = page.getByRole('link', { name: 'Volver' })
      const b = await caja(volver)
      expect(b.height, ruta).toBeGreaterThanOrEqual(44)
      expect(b.width, ruta).toBeGreaterThanOrEqual(44)
      // arriba a la izquierda (a la altura del título, que en computadora empieza después de la barra lateral)
      const t = await caja(page.getByRole('heading', { level: 1 }))
      expect(b.x, ruta).toBeLessThanOrEqual(t.x)
      expect(b.abajo, ruta).toBeLessThanOrEqual(t.y + 1)
      if (ruta === '/vencimientos') await captura(page, '2-volver')
    }
    // entrar directo y tocar Volver: no hay pantalla anterior, va a Inicio
    await page.goto('/vencimientos')
    const volver = page.getByRole('link', { name: 'Volver' })
    await hidratado(volver)
    await volver.click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('vuelve a la pantalla anterior', async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    await page.goto('/calendario')
    const link = page.getByRole('link', { name: /^Recordatorios/ })
    await hidratado(link)
    await link.click()
    await expect(page).toHaveURL(/\/recordatorios$/)
    await page.getByRole('link', { name: 'Volver' }).click()
    await expect(page).toHaveURL(/\/calendario$/)
    // una carpeta vuelve a Documentos
    await page.goto('/documentos')
    const seguros = page.getByRole('link', { name: /^Seguros/ })
    await hidratado(seguros)
    await seguros.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seguros')
    await page.getByRole('link', { name: 'Volver' }).click()
    await expect(page).toHaveURL(/\/documentos$/)
  })

  test('las pestañas del menú no tienen Volver (en el modo familia, Fotos es pestaña)', async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    for (const ruta of ['/', '/calendario', '/contame', '/mensajes', '/casas']) {
      await page.goto(ruta)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Volver' }), ruta).toHaveCount(0)
    }
    await entrarComo(page, 'familia')
    await page.goto('/fotos')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver' })).toHaveCount(0)
    await page.goto('/recordatorios')
    await expect(page.getByRole('link', { name: 'Volver' })).toBeVisible()
  })
})

test('Calendario: sin la tarjeta azul del próximo cumple, solo la lista', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { fechas: [{ nombre: 'Ana Pérez', tipo: 'cumple', dia: '01-08' }, { nombre: 'Luis', tipo: 'cumple', dia: '12-03' }] } })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  await expect(page.locator('[data-fila]').filter({ hasText: 'Luis' })).toBeVisible()
  await expect(page.locator('section.bg-azul')).toHaveCount(0)
  await expect(page.getByText(/^En \d+ días/)).toHaveCount(0)
  await captura(page, '1-calendario')
})

test.describe('Hojas', () => {
  test('con una hoja abierta el fondo no se mueve, y al cerrar vuelve a donde estaba', async ({ page }) => {
    const muchos = Array.from({ length: 16 }, (_, i) => ({ titulo: `Recordatorio ${i + 1}`, dia: `0${(i % 9) + 1}-1${i % 9}`, avisarDiasAntes: 7 }))
    await resetear(page, { hoy: HOY, datos: { recordatorios: muchos } })
    await entrarComo(page, 'owner')
    await page.goto('/recordatorios')
    const mas = page.getByRole('button', { name: 'Agregar recordatorio' })
    await hidratado(mas)
    await page.evaluate(() => window.scrollTo(0, 400))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400)
    const fila = page.locator('[data-fila]').filter({ hasText: 'Recordatorio 12' })
    const antes = (await caja(fila)).y
    // tocar el + sin que Playwright haga scroll hasta él
    await mas.dispatchEvent('click')
    const hoja = page.getByRole('dialog', { name: 'Agregar recordatorio' })
    await expect(hoja).toBeVisible()
    // el body queda fijo donde estaba: la lista de atrás no se mueve
    expect(await page.evaluate(() => getComputedStyle(document.body).position)).toBe('fixed')
    expect((await caja(fila)).y).toBeCloseTo(antes, 0)
    // intentar desplazar la página no la mueve
    await page.evaluate(() => window.scrollBy(0, 600))
    expect((await caja(fila)).y).toBeCloseTo(antes, 0)
    // la hoja: scroll contenido y nada para los costados
    const estilos = await hoja.evaluate((el) => { const s = getComputedStyle(el); return [s.overscrollBehaviorY, s.overflowX] })
    expect(estilos).toEqual(['contain', 'hidden'])
    await captura(page, '3-hoja-fondo-quieto')
    await hoja.getByRole('button', { name: 'Cerrar' }).click()
    await expect(hoja).toHaveCount(0)
    expect(await page.evaluate(() => getComputedStyle(document.body).position)).not.toBe('fixed')
    expect(await page.evaluate(() => window.scrollY)).toBe(400)
  })

  test('ninguna hoja se mueve para los costados: el campo Hora entra en su columna', async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    await page.goto('/calendario')
    const mas = page.getByRole('button', { name: 'Agregar fecha' })
    await hidratado(mas)
    await mas.click()
    const hoja = page.getByRole('dialog', { name: 'Nueva fecha' })
    await hoja.getByRole('radio', { name: 'Otra' }).click()
    const hora = hoja.getByLabel('Hora (opcional)')
    await hora.fill('18:30')
    const h = await caja(hora), a = await caja(hoja.getByLabel('Año (desde)'))
    expect(h.derecha).toBeLessThanOrEqual((await caja(hoja)).derecha - 19)
    expect(h.x).toBeGreaterThan(a.derecha)
    expect(await hoja.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0)
    // intentar arrastrarla para el costado no la mueve
    await hoja.evaluate((el) => { el.scrollLeft = 80 })
    expect(await hoja.evaluate((el) => el.scrollLeft)).toBe(0)
    await captura(page, '5-hora')
  })

  test('el + de Tareas pendientes y "+ Grupo" de Contactos: la hoja queda arriba del teclado', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'el teclado es del teléfono')
    await tecladoFalso(page)
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    const alto = page.viewportSize()!.height
    for (const [ruta, boton, titulo, campo] of [
      ['/pendientes', 'Agregar tarea', 'Nueva tarea', 'Qué hay que hacer'],
      ['/contactos', 'Grupo', 'Nuevo grupo', 'Nombre del grupo'],
    ] as const) {
      await page.goto(ruta)
      const b = page.getByRole('button', { name: boton, exact: true })
      await hidratado(b)
      await b.click()
      const hoja = page.getByRole('dialog', { name: titulo })
      await expect(hoja.getByLabel(campo)).toBeFocused()
      await abrirTeclado(page)
      await expect.poll(async () => (await caja(hoja)).abajo, titulo).toBeLessThanOrEqual(alto - TECLADO + 1)
      expect((await caja(hoja)).y, titulo).toBeGreaterThanOrEqual(0)
      const c = await caja(hoja.getByLabel(campo))
      expect(c.abajo, titulo).toBeLessThanOrEqual(alto - TECLADO)
      await expect(hoja.getByRole('button', { name: titulo === 'Nueva tarea' ? 'Guardar' : 'Crear grupo' })).toBeInViewport()
      if (ruta === '/pendientes') await captura(page, '4-teclado-tarea')
      else await captura(page, '4-teclado-grupo')
    }
  })

  test('toda hoja con campo de texto se ubica arriba del teclado', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'el teclado es del teléfono')
    await tecladoFalso(page)
    await resetear(page, { hoy: HOY })
    await entrarComo(page, 'owner')
    const alto = page.viewportSize()!.height
    const hojas: [string, string, string][] = [
      ['/calendario', 'Agregar fecha', 'Nueva fecha'],
      ['/recordatorios', 'Agregar recordatorio', 'Agregar recordatorio'],
      ['/vencimientos', 'Agregar vencimiento', 'Nuevo vencimiento'],
      ['/contactos', 'Agregar contacto', 'Nuevo contacto'],
      ['/pendientes', 'Agregar nota', 'Nueva nota'],
      ['/documentos', 'Nueva carpeta', 'Nueva carpeta'],
      ['/casas', 'Agregar persona', 'Nueva persona'],
      ['/casas', 'Agregar servicio', 'Nuevo servicio'],
      ['/casas', 'Agregar al historial', 'Agregar al historial'],
    ]
    for (const [ruta, boton, titulo] of hojas) {
      await page.goto(ruta)
      const b = page.getByRole('button', { name: boton, exact: true })
      await hidratado(b)
      await b.click()
      const hoja = page.getByRole('dialog', { name: titulo })
      const campo = hoja.getByRole('textbox').first()
      await campo.click()
      await abrirTeclado(page)
      await expect.poll(async () => (await caja(hoja)).abajo, titulo).toBeLessThanOrEqual(alto - TECLADO + 1)
      expect((await caja(hoja)).y, titulo).toBeGreaterThanOrEqual(0)
      await expect.poll(async () => (await caja(campo)).abajo, titulo).toBeLessThanOrEqual(alto - TECLADO)
      expect((await caja(campo)).y, titulo).toBeGreaterThanOrEqual(0)
      expect(await hoja.evaluate((el) => el.scrollWidth - el.clientWidth), titulo).toBe(0)
    }
  })
})

test('Posponer: de menor a mayor, con la por defecto marcada en su lugar', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { recordatorios: [{ titulo: 'Renovar el seguro', dia: '11-30', avisarDiasAntes: 30, posponerDias: 7 }] } })
  await entrarComo(page, 'owner')
  await page.goto('/recordatorios')
  const posponer = page.getByRole('article', { name: 'Renovar el seguro' }).getByRole('button', { name: 'Posponer' })
  await hidratado(posponer)
  await posponer.click()
  const hoja = page.getByRole('dialog', { name: 'Posponer Renovar el seguro' })
  expect(await hoja.locator('label').allTextContents()).toEqual(['1 día', '3 días', '1 semana', '15 días', '1 mes', 'Elegir fecha'])
  await expect(hoja.getByRole('radio', { name: '1 semana' })).toBeChecked()
  await captura(page, '6-posponer')
})

test('Borrar foto: pide confirmación; Cancelar la deja', async ({ page }) => {
  await resetear(page, { hoy: HOY })
  await entrarComo(page, 'owner')
  const subida = await page.request.post('/api/archivos', { multipart: { tipo: 'foto', file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: FOTO } } })
  expect(subida.status()).toBe(200)
  await page.goto('/fotos')
  const ver = page.getByRole('button', { name: 'Ver foto' })
  await hidratado(ver)
  await ver.click()
  const visor = page.getByRole('dialog', { name: 'Foto' })
  await visor.getByRole('button', { name: 'Borrar foto' }).click()
  const confirmar = page.getByRole('alertdialog', { name: '¿Borrar esta foto?' })
  await expect(confirmar).toBeVisible()
  const borrar = confirmar.getByRole('button', { name: 'Borrar' })
  expect(await borrar.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(179, 38, 30)')
  await expect(confirmar.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await captura(page, '7-borrar-foto')
  await confirmar.getByRole('button', { name: 'Cancelar' }).click()
  await expect(confirmar).toHaveCount(0)
  await expect(visor).toBeVisible()
  await visor.getByRole('button', { name: 'Cerrar' }).click()
  await expect(ver).toBeVisible()
})

test.describe('Todas las semanas, algunos días', () => {
  test('Calendario "Otra": chips L M M J V S D con hoy marcado, sin Día/Mes/Año; la próxima es el próximo día marcado', async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { fechas: [] } })
    await entrarComo(page, 'owner')
    await page.goto('/calendario')
    const mas = page.getByRole('button', { name: 'Agregar fecha' })
    await hidratado(mas)
    await mas.click()
    const hoja = page.getByRole('dialog', { name: 'Nueva fecha' })
    await hoja.getByLabel('Nombre').fill('Clase de golf')
    await hoja.getByRole('radio', { name: 'Otra' }).click()
    await hoja.getByRole('combobox', { name: 'Se repite' }).selectOption('semanal')
    const dias = hoja.getByRole('group', { name: 'Qué días' })
    await expect(dias.getByRole('checkbox')).toHaveCount(7)
    expect(await dias.getByRole('checkbox').allTextContents()).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D'])
    // viene marcado hoy (martes)
    await expect(dias.getByRole('checkbox', { name: 'martes' })).toBeChecked()
    await expect(hoja.getByLabel('Día', { exact: true })).toHaveCount(0)
    await expect(hoja.getByLabel('Mes', { exact: true })).toHaveCount(0)
    await expect(hoja.getByLabel(/^Año/)).toHaveCount(0)
    await expect(hoja.getByLabel('Hora (opcional)')).toBeVisible()
    // mínimo uno: el último marcado no se desmarca
    await dias.getByRole('checkbox', { name: 'martes' }).click()
    await expect(dias.getByRole('checkbox', { name: 'martes' })).toBeChecked()
    await dias.getByRole('checkbox', { name: 'jueves' }).click()
    await dias.getByRole('checkbox', { name: 'sábado' }).click()
    await dias.getByRole('checkbox', { name: 'martes' }).click()
    await expect(dias.getByRole('checkbox', { name: 'martes' })).not.toBeChecked()
    await hoja.getByLabel('Hora (opcional)').fill('10:00')
    await captura(page, '8-semanal-calendario')
    await hoja.getByRole('button', { name: 'Guardar' }).click()
    await expect(hoja).toHaveCount(0)
    // próxima: jueves 26
    const fila = page.locator('[data-fila]').filter({ hasText: 'Clase de golf' })
    await expect(fila).toContainText('26')
    await expect(fila).toContainText('jue y sáb')
    await expect(fila).toContainText('10:00 h')
  })

  test('Recordatorios: chips en lugar de Día/Mes/Año y aviso ese mismo día', async ({ page }) => {
    await resetear(page, { hoy: HOY, sinSeed: true })
    await entrarComo(page, 'owner')
    await page.goto('/recordatorios')
    const mas = page.getByRole('button', { name: 'Agregar recordatorio' })
    await hidratado(mas)
    await mas.click()
    const hoja = page.getByRole('dialog', { name: 'Agregar recordatorio' })
    await hoja.getByLabel('Título').fill('Sacar la basura')
    await hoja.getByRole('combobox', { name: 'Se repite' }).selectOption('semanal')
    const dias = hoja.getByRole('group', { name: 'Qué días' })
    await expect(dias.getByRole('checkbox', { name: 'martes' })).toBeChecked()
    await expect(hoja.getByLabel('Día', { exact: true })).toHaveCount(0)
    await expect(hoja.getByLabel('Mes', { exact: true })).toHaveCount(0)
    await expect(hoja.getByLabel('Año', { exact: true })).toHaveCount(0)
    await expect(hoja.getByText('Te aviso ese mismo día.')).toBeVisible()
    await dias.getByRole('checkbox', { name: 'viernes' }).click()
    await captura(page, '8-semanal-recordatorio')
    await hoja.getByRole('button', { name: 'Guardar' }).click()
    await expect(hoja).toHaveCount(0)
    // hoy es martes: ya está para gestionar
    await expect(page.getByRole('article', { name: 'Sacar la basura' })).toContainText('es hoy')
    await expect(page.locator('[data-fila]').filter({ hasText: 'Sacar la basura' })).toContainText('cada semana: mar y vie · aviso ese día')
    // al editar vienen marcados sus días
    await page.getByRole('button', { name: 'Editar Sacar la basura' }).click()
    const editar = page.getByRole('dialog', { name: 'Editar recordatorio' })
    await expect(editar.getByRole('checkbox', { name: 'martes' })).toBeChecked()
    await expect(editar.getByRole('checkbox', { name: 'viernes' })).toBeChecked()
    await expect(editar.getByRole('checkbox', { name: 'lunes' })).not.toBeChecked()
  })
})
