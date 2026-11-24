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
  await page.goto('/calendario')
  const mandar = page.getByRole('button', { name: 'Mandar saludo' })
  await hidratado(mandar)
  await paginaEntera(page, path.join(RAIZ, info.project.name, 'calendario-dia-del-cumple.png'))
  await mandar.click()
  await expect(page.getByRole('dialog', { name: 'Saludo para Ana' })).toBeVisible()
  await foto(page, 'calendario-saludo', info.project.name)
})
