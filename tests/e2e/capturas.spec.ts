import { test, expect, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { decir, entrarComo, guion, hidratado, instalarVozFalsa } from './helpers'
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

test('captura calendario: saludo y agregar fecha @capturas', async ({ page }, info) => {
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  const agregar = page.getByRole('button', { name: 'Agregar fecha' })
  // la página ya enganchada: la captura oculta el cursor de los campos y React lo notaría al hidratar
  await hidratado(agregar)
  await hidratado(page.getByRole('textbox', { name: 'Saludo' }))
  const saludo = page.getByRole('region', { name: 'Próximo cumpleaños' })
  await saludo.screenshot({ path: path.join(RAIZ, info.project.name, 'calendario-saludo.png'), animations: 'disabled' })
  await agregar.click()
  await expect(page.getByRole('dialog', { name: 'Agregar fecha' })).toBeVisible()
  await page.getByLabel('Nombre').fill('Sofía Rodríguez')
  await foto(page, 'calendario-agregar-fecha', info.project.name)
})

test('captura contame con transcripción @capturas', async ({ page }, info) => {
  await entrarComo(page, 'owner')
  await page.addInitScript(instalarVozFalsa)
  await page.goto('/contame')
  const hablar = page.getByRole('button', { name: 'Tocá para hablar' })
  await hidratado(hablar)
  await hablar.click()
  await decir(page, 'Ayer le pagué a Rosa la limpieza de Portofino. Mañana llamar al contador por el balance.')
  await expect(page.getByText('Ayer le pagué a Rosa')).toBeVisible()
  await foto(page, 'contame-escuchando', info.project.name)
  await page.getByRole('button', { name: 'Tocá para terminar' }).click()
  await expect(page.getByLabel('Lo que entendí · podés corregirlo')).toBeVisible()
  await foto(page, 'contame-transcripcion', info.project.name)
})

test('captura mensajes con respuesta @capturas', async ({ page }, info) => {
  await entrarComo(page, 'owner')
  await guion(page, [{ texto: 'Estimado Martín: sí, el viernes cerramos sin problema. Le confirmo el horario durante la semana. Saludos cordiales, Alfredo.' }])
  await page.goto('/mensajes')
  const escribieron = page.getByRole('button', { name: 'Me escribieron' })
  await hidratado(escribieron)
  await escribieron.click()
  await page.getByLabel('Pegá el mensaje que te mandaron').fill('Hola Alfredo, ¿cerramos el viernes lo del pedido?')
  await page.getByRole('button', { name: 'Sugerir respuesta' }).click()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveValue(/Estimado Martín/)
  await paginaEntera(page, path.join(RAIZ, info.project.name, 'mensajes-respuesta.png'))
})
