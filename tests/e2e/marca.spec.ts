import { test, expect } from '@playwright/test'
import { entrarComo, resetear } from './helpers'

// Ronda 4b: nombre AlfredIA, íconos, pantallas de carga de iOS e intro del cabezón.

test('nombre AlfredIA: título, manifest (#112A50) e íconos', async ({ page }) => {
  await page.goto('/entrar')
  await expect(page).toHaveTitle('AlfredIA')
  await expect(page.getByRole('main').getByText('AlfredIA', { exact: true })).toBeVisible()
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'AlfredIA', short_name: 'AlfredIA', theme_color: '#112A50', background_color: '#112A50' })
  for (const i of manifest.icons as { src: string }[]) expect((await page.request.get(i.src)).status(), i.src).toBe(200)
  expect((manifest.icons as { purpose?: string }[]).some((i) => i.purpose === 'maskable')).toBe(true)
  const apple = page.locator('link[rel="apple-touch-icon"]')
  await expect(apple).toHaveAttribute('href', /apple-touch-icon\.png/)
  expect((await page.request.get('/apple-touch-icon.png')).status()).toBe(200)
  expect((await page.request.get('/favicon-32.png')).status()).toBe(200)
})

test('pantallas de carga de iOS: una por iPhone (14 a 17 Pro Max) y todas existen', async ({ page }) => {
  await page.goto('/entrar')
  const links = page.locator('link[rel="apple-touch-startup-image"]')
  await expect(links).toHaveCount(7)
  const medias = await links.evaluateAll((ls) => ls.map((l) => [l.getAttribute('href'), l.getAttribute('media')]))
  expect(medias).toContainEqual(['/carga/1179x2556.jpg', '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'])
  expect(medias).toContainEqual(['/carga/1320x2868.jpg', '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'])
  for (const [href] of medias) expect((await page.request.get(href!)).status(), href!).toBe(200)
})

test('Bienvenida dice AlfredIA y sigue "Esta app es tu regalo"', async ({ page }) => {
  await resetear(page, { config: { bienvenidaVista: false } })
  await entrarComo(page, 'owner')
  await page.goto('/bienvenida')
  await expect(page.getByRole('main').getByText('AlfredIA', { exact: true })).toBeVisible()
  await expect(page.getByText(/Esta app es tu regalo/)).toBeVisible()
})

test.describe('intro del cabezón', () => {
  const intro = '#intro'

  test('en las pruebas no sale sola (no tapa nada)', async ({ page }) => {
    await page.goto('/entrar')
    await expect(page.locator(intro)).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-intro'))).toBe('no')
  })

  for (const [escena, cuadros] of [['golf', 4], ['padel', 3]] as const) {
    test(`en frío: ${escena}, cuerpos con la cabeza que se bambolea y "AlfredIA · De: Pau y Diego"; se va sola en ~2,5 s y no vuelve en la sesión`, async ({ page }) => {
      await page.addInitScript((e) => localStorage.setItem('alfredia:con-intro', e), escena)
      await page.goto('/entrar')
      const capa = page.locator(intro)
      await expect(capa).toBeVisible()
      const esc = capa.locator(`[data-escena="${escena}"]`)
      await expect(esc).toBeVisible()
      await expect(capa.locator('.in-escena:visible')).toHaveCount(1)
      await expect(esc.locator('[data-cuadro]')).toHaveCount(cuadros)
      await expect(esc.locator('img.in-cabeza')).toHaveCount(cuadros)
      expect(await esc.locator('img.in-cabeza').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('in-bambolea')
      await expect(capa).toContainText('AlfredIA')
      await expect(capa).toContainText('De: Pau y Diego')
      await expect(capa).toBeHidden({ timeout: 4000 })
      await page.reload()
      await expect(capa).toBeHidden()
    })
  }

  test('se alternan golf y pádel en cada apertura', async ({ browser }) => {
    const escenas: string[] = []
    const ctx = await browser.newContext()
    await ctx.addInitScript(() => localStorage.setItem('alfredia:con-intro', '1'))
    for (let i = 0; i < 3; i++) {
      // pestaña nueva = sesión nueva (arranque en frío); el localStorage se comparte
      const page = await ctx.newPage()
      await page.goto('/entrar')
      escenas.push((await page.evaluate(() => document.documentElement.getAttribute('data-intro')))!)
      await page.close()
    }
    await ctx.close()
    expect(escenas[0]).not.toBe(escenas[1])
    expect(escenas[2]).toBe(escenas[0])
    expect(['golf', 'padel']).toContain(escenas[0])
  })

  test('tocando se saltea', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('alfredia:con-intro', 'golf'))
    await page.goto('/entrar')
    const capa = page.locator(intro)
    await expect(capa).toBeVisible()
    await page.mouse.click(20, 20)
    await expect(capa).toBeHidden({ timeout: 500 })
  })

  test('con "reducir movimiento": el último cuadro, quieto, medio segundo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => localStorage.setItem('alfredia:con-intro', 'padel'))
    await page.goto('/entrar')
    const capa = page.locator(intro)
    await expect(capa).toBeVisible()
    const opacidades = await capa.locator('[data-escena="padel"] [data-cuadro]').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))
    expect(opacidades).toEqual(['0', '0', '1'])
    expect(await capa.locator('img.in-cabeza').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
    await expect(capa).toBeHidden({ timeout: 1500 })
  })
})
