import { test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { abrir, PANTALLAS, sembrar } from './pantallas'

/**
 * Capturas para revisar a ojo (no corre con `pnpm e2e`; se corre con `pnpm capturas`).
 * Deja capturas/<proyecto>/<pantalla>.png (página entera) y capturas/mockup/<nombre>.png (el mockup a 390×844).
 */

const RAIZ = path.join(__dirname, '..', '..', 'capturas')
const MOCKUP = path.join(__dirname, '..', '..', 'docs', 'mockup')

let carpetaId = ''
test.beforeAll(async ({ browser }) => { carpetaId = await sembrar(browser) })

for (const p of PANTALLAS) {
  test(`captura ${p.nombre} @capturas`, async ({ page }, info) => {
    await abrir(page, p, carpetaId)
    await page.screenshot({ path: path.join(RAIZ, info.project.name, `${p.nombre}.png`), fullPage: true })
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
