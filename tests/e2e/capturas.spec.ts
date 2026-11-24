import { test, expect, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { decir, entrarComo, guion, hidratado, instalarVozFalsa, resetear } from './helpers'
import { abrir, PANTALLAS, sembrar } from './pantallas'

/**
 * Capturas para revisar a ojo (no corre con `pnpm e2e`; se corre con `pnpm capturas`).
 * Deja capturas/<proyecto>/<pantalla>.png (página entera) y capturas/mockup/<nombre>.png (el mockup a 390×844).
 */

const RAIZ = path.join(__dirname, '..', '..', 'capturas')
const MOCKUP = path.join(__dirname, '..', '..', 'docs', 'mockup')

let carpetaId = ''
test.beforeAll(async ({ browser }) => { carpetaId = await sembrar(browser) })

// Errores de la consola en cada captura (el globo de errores de Next saldría en la imagen).
test.beforeEach(async ({ page }, info) => {
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${info.title}] consola: ${m.text().slice(0, 400)}`) })
  page.on('pageerror', (e) => console.log(`[${info.title}] error: ${e.message.slice(0, 400)}`))
})

for (const p of PANTALLAS) {
  test(`captura ${p.nombre} @capturas`, async ({ page }, info) => {
    await abrir(page, p, carpetaId)
    await paginaEntera(page, path.join(RAIZ, info.project.name, `${p.nombre}.png`))
  })
}

test('mockups a 390×844 @capturas', async ({ browser }, info) => {
  test.skip(info.project.name !== 'chromium-390x844', 'una sola vez')
  // isMobile: false a propósito: el mockup no trae <meta viewport> y en modo móvil se dibujaría a 980 px y achicado.
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false })
  for (const archivo of readdirSync(MOCKUP).filter((a) => a.endsWith('.dc.html'))) {
    await page.goto(`file://${path.join(MOCKUP, archivo)}`)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(RAIZ, 'mockup', `${archivo.replace('.dc.html', '')}.png`) })
  }
  await page.close()
})

/**
 * La pantalla entera con el menú abajo, como en el teléfono: se agranda la ventana al alto de la página
 * (con `fullPage` el menú fijo quedaría en el medio, donde terminaba la pantalla).
 */
async function paginaEntera(page: Page, archivo: string) {
  const ventana = page.viewportSize()!
  const alto = await page.evaluate(() => document.documentElement.scrollHeight)
  if (alto > ventana.height) await page.setViewportSize({ width: ventana.width, height: alto })
  await page.screenshot({ path: archivo, animations: 'disabled' })
  await page.setViewportSize(ventana)
}

/** Paneles y estados abiertos (lo que se ve en pantalla, sin animaciones a medias). */
const foto = (page: Page, nombre: string, proyecto: string) =>
  page.screenshot({ path: path.join(RAIZ, proyecto, `${nombre}.png`), animations: 'disabled' })

test('captura calendario: nueva fecha @capturas', async ({ page }, info) => {
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  const agregar = page.getByRole('button', { name: 'Agregar fecha' })
  await hidratado(agregar)
  await agregar.click()
  const hoja = page.getByRole('dialog', { name: 'Nueva fecha' })
  await hoja.getByLabel('Nombre').fill('Sofía Rodríguez')
  await hoja.getByLabel('Día', { exact: true }).selectOption('8')
  await hoja.getByLabel('Mes').selectOption('12')
  await hoja.getByLabel('Año de nacimiento (opcional)').fill('1985')
  await foto(page, 'calendario-nueva-fecha', info.project.name)
})

test('captura documento nuevo (foto primero) @capturas', async ({ page }, info) => {
  await entrarComo(page, 'owner')
  await page.goto(`/documentos/${carpetaId}`)
  const mas = page.getByRole('button', { name: 'Agregar documento' })
  await hidratado(mas)
  await mas.click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo documento' })
  await hoja.locator('input[type=file]:not([capture])').setInputFiles(path.join(__dirname, 'fixtures', 'foto.jpg'))
  await hoja.getByLabel('Título').fill('Póliza de la camioneta')
  await expect(hoja.getByText('Foto lista')).toBeVisible()
  await foto(page, 'documento-nuevo', info.project.name)
})

test('captura contame con transcripción @capturas', async ({ page }, info) => {
  await entrarComo(page, 'owner')
  await page.addInitScript(instalarVozFalsa)
  await page.goto('/contame')
  const hablar = page.getByRole('button', { name: 'Tocá para hablar' })
  await hidratado(hablar)
  await hablar.click()
  await decir(page, 'Simón viene el jueves a cortar el pasto de Portofino. Vence el seguro del auto el 29 y anotá que tengo que llamar a DirecTV.')
  await expect(page.getByText('Simón viene el jueves')).toBeVisible()
  await foto(page, 'contame-escuchando', info.project.name)
  await page.getByRole('button', { name: 'Tocá para terminar' }).click()
  await expect(page.getByLabel('Lo que entendí · podés corregirlo')).toBeVisible()
  await foto(page, 'contame-revisar', info.project.name)
})

test('captura mensajes con respuesta @capturas', async ({ page }, info) => {
  await entrarComo(page, 'owner')
  await guion(page, [{ texto: 'Estimado Martín: sí, el viernes cerramos sin problema. Le confirmo el horario durante la semana. Saludos cordiales, Alfredo.' }])
  await page.goto('/mensajes')
  const sugerir = page.getByRole('button', { name: 'Sugerir respuesta' })
  await hidratado(sugerir)
  await page.getByLabel('Pegá el mensaje que te mandaron').fill('Hola Alfredo, ¿cerramos el viernes lo del pedido de hormigón?')
  await sugerir.click()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveValue(/Estimado Martín/)
  await paginaEntera(page, path.join(RAIZ, info.project.name, 'mensajes-respuesta.png'))
})

// Último: cambia "hoy" al día del cumple de Ana (para "Mandar saludo"), así que va al final.
test('captura calendario el día del cumple y el saludo @capturas', async ({ page }, info) => {
  await resetear(page, { hoy: '2026-11-25', config: { nombre: 'Alfredo' }, datos: { fechas: [
    { nombre: 'Ana Pérez', tipo: 'cumple', dia: '11-25', anioNacimiento: 1990 },
    { nombre: 'Día del abuelo', tipo: 'otra', dia: '11-30' },
    { nombre: 'Luis y Marta', tipo: 'aniversario', dia: '12-03' },
    { nombre: 'Sofía Rodríguez', tipo: 'cumple', dia: '12-08', anioNacimiento: 1985 },
  ] } })
  await entrarComo(page, 'owner')
  await page.addInitScript(() => { try { localStorage.setItem('alfredo:brindis', '2026-11-25') } catch { /* nada */ } })
  await page.goto('/calendario')
  const mandar = page.getByRole('button', { name: 'Mandar saludo' })
  await hidratado(mandar)
  await paginaEntera(page, path.join(RAIZ, info.project.name, 'calendario-dia-del-cumple.png'))
  await mandar.click()
  await expect(page.getByRole('dialog', { name: 'Saludo para Ana' })).toBeVisible()
  await foto(page, 'calendario-saludo', info.project.name)
})

// Detalles personales (ronda 3). Los que cambian los datos van al final.
test('captura contame guardando (pádel) @capturas', async ({ page }, info) => {
  // la captura del cumple dejó "hoy" en el 25/11 (con brindis): de vuelta al 22
  await resetear(page, { hoy: '2026-11-22', config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  await guion(page, [{ texto: '', toolName: 'guardar', toolInput: { acciones: [{ tipo: 'pendiente', texto: 'Llamar a DirecTV' }] } }])
  let soltar!: () => void
  const espera = new Promise<void>((r) => { soltar = r })
  await page.route('**/api/ai/contame', async (ruta) => { await espera; await ruta.continue() })
  await page.goto('/contame')
  const escribir = page.getByRole('button', { name: 'Prefiero escribir' })
  await hidratado(escribir)
  await escribir.click()
  await page.getByLabel('Escribí o dictá con el teclado').fill('Anotá que tengo que llamar a DirecTV.')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.locator('[data-detalle="padel"]')).toBeVisible()
  await page.waitForTimeout(500)
  await foto(page, 'detalle-padel-contame', info.project.name)
  soltar()
})

test('captura mensajes otra versión (dados) @capturas', async ({ page }, info) => {
  // la captura del cumple dejó "hoy" en el 25/11 (con brindis): de vuelta al 22
  await resetear(page, { hoy: '2026-11-22', config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  await guion(page, [{ texto: 'Estimado Martín: sí, el viernes cerramos sin problema. Saludos cordiales, Alfredo.' }, { texto: 'Hola Martín, confirmado para el viernes. Un saludo, Alfredo.' }])
  await page.goto('/mensajes')
  const sugerir = page.getByRole('button', { name: 'Sugerir respuesta' })
  await hidratado(sugerir)
  await page.getByLabel('Pegá el mensaje que te mandaron').fill('Hola Alfredo, ¿cerramos el viernes lo del pedido de hormigón?')
  await sugerir.click()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveValue(/Estimado Martín/)
  let soltar!: () => void
  const espera = new Promise<void>((r) => { soltar = r })
  await page.route('**/api/ai/mensajes', async (ruta) => { await espera; await ruta.continue() })
  await page.getByRole('button', { name: 'Otra versión' }).click()
  await expect(page.getByRole('img', { name: 'Se tiran dos dados' })).toBeVisible()
  await page.waitForTimeout(1100)
  await paginaEntera(page, path.join(RAIZ, info.project.name, 'detalle-dados-mensajes.png'))
  soltar()
})

test('captura pendientes: Flor y golf @capturas', async ({ page }, info) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('limpio')) { localStorage.clear(); sessionStorage.setItem('limpio', '1') } } catch { /* nada */ } })
  await resetear(page, { hoy: '2026-11-22', config: { nombre: 'Alfredo' }, datos: { pendientes: ['Pagar la luz de Portofino', 'Llamar al contador', 'Renovar la cédula'].map((texto) => ({ texto, hecho: false, creadoEn: '2026-11-20T12:00:00.000Z' })) } })
  await entrarComo(page, 'owner')
  await page.goto('/pendientes')
  for (const t of ['Pagar la luz de Portofino', 'Llamar al contador', 'Renovar la cédula']) {
    const c = page.getByRole('region', { name: 'Por hacer' }).getByRole('checkbox', { name: t })
    await hidratado(c)
    await c.click()
    await expect(page.getByRole('region', { name: 'Por hacer' }).getByText(t)).toHaveCount(0)
  }
  await expect(page.locator('[data-detalle="flor"]')).toBeVisible()
  await page.waitForTimeout(1300)
  await foto(page, 'detalle-flor', info.project.name)
  await expect(page.locator('[data-detalle="flor"]')).toHaveCount(0, { timeout: 5000 })
  await page.waitForTimeout(2200)
  await foto(page, 'detalle-golf', info.project.name)
})

test('captura vencimientos sin nada pendiente (swing) @capturas', async ({ page }, info) => {
  await resetear(page, { hoy: '2026-11-22' })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  await expect(page.locator('[data-detalle="swing"]')).toBeVisible()
  await page.waitForTimeout(1800)
  await foto(page, 'detalle-swing', info.project.name)
})

test('captura Inicio: deslizar para actualizar (hielo) @capturas', async ({ page }, info) => {
  await resetear(page, { hoy: '2026-11-22', config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  await page.goto('/')
  await hidratado(page.getByRole('link', { name: 'Ajustes' }))
  await page.evaluate(() => {
    const toque = (y: number): Touch[] => {
      try { return [new Touch({ identifier: 1, target: document.body, clientX: 150, clientY: y })] } catch { /* WebKit */ }
      const crear = (document as unknown as { createTouch: (...a: unknown[]) => Touch }).createTouch
      return [crear.call(document, window, document.body, 1, 150, y, 150, y)]
    }
    const lista = (ts: Touch[]) => {
      const crear = (document as unknown as { createTouchList?: (...t: Touch[]) => TouchList }).createTouchList
      return (typeof crear === 'function' ? crear.call(document, ...ts) : ts) as unknown as Touch[]
    }
    const disparar = (tipo: string, y: number) =>
      window.dispatchEvent(new TouchEvent(tipo, { touches: lista(tipo === 'touchend' ? [] : toque(y)), changedTouches: lista(toque(y)), bubbles: true }))
    disparar('touchstart', 100)
    for (const y of [160, 240, 320]) disparar('touchmove', y)
    disparar('touchend', 320)
  })
  await expect(page.getByText('Actualizando')).toBeVisible()
  await page.waitForTimeout(500)
  await foto(page, 'detalle-hielo-inicio', info.project.name)
})

test('captura brindis del 25 de noviembre (whisky) @capturas', async ({ page }, info) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('limpio')) { localStorage.clear(); sessionStorage.setItem('limpio', '1') } } catch { /* nada */ } })
  await resetear(page, { hoy: '2026-11-25', config: { nombre: 'Alfredo' } })
  await entrarComo(page, 'owner')
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Brindis de cumpleaños' })).toBeVisible()
  await page.waitForTimeout(2600)
  await foto(page, 'detalle-brindis', info.project.name)
})
