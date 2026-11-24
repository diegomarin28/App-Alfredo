import { test, expect, type Page, type Locator } from '@playwright/test'
import { entrarComo, hidratado, resetear } from './helpers'

const HOY = '2026-11-22'

// Borrar (mockup v2): basurita roja de 44 px; la fila se pliega al instante y abajo queda "Se borró … · Deshacer"
// 5 s. Recién después se borra de verdad. El reloj de la página se adelanta para no esperar.

/** Toca la basurita de la fila: se pliega y aparece el aviso con Deshacer. */
async function borrar(page: Page, fila: Locator, nombre: string) {
  const boton = fila.getByRole('button', { name: `Borrar ${nombre}` })
  await hidratado(boton)
  const caja = (await boton.boundingBox())!
  expect(caja.height).toBeGreaterThanOrEqual(44)
  expect(caja.width).toBeGreaterThanOrEqual(44)
  await boton.click()
  await expect(fila).toBeHidden()
  const aviso = page.getByRole('status').filter({ hasText: `Se borró ${nombre}` })
  await expect(aviso.getByRole('button', { name: 'Deshacer' })).toBeVisible()
  return aviso
}

/** Pasan los 5 s: se borra de verdad y el aviso se va. */
async function pasan5s(page: Page, aviso: Locator) {
  await page.clock.fastForward(5_100)
  await expect(aviso).toHaveCount(0)
}

for (const rol of ['owner', 'familia'] as const) {
  test(`${rol}: borrar una foto (desde la foto grande) saca la foto y el archivo`, async ({ page }) => {
    await page.clock.install()
    await resetear(page, { hoy: HOY })
    await entrarComo(page, rol)
    const subida = await page.request.post('/api/archivos', {
      multipart: { tipo: 'foto', file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('abc') } },
    })
    expect(subida.status()).toBe(200)
    const { path } = (await subida.json()) as { path: string }
    expect((await page.request.get(`/api/archivos/${path}`)).status()).toBe(200)

    await page.goto('/fotos')
    const ver = page.getByRole('button', { name: 'Ver foto' })
    await hidratado(ver)
    await ver.click()
    await page.getByRole('dialog', { name: 'Foto' }).getByRole('button', { name: 'Borrar foto' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(ver).toBeHidden()
    const aviso = page.getByRole('status').filter({ hasText: 'Se borró la foto' })
    await pasan5s(page, aviso)
    await page.reload()
    await expect(page.getByRole('img', { name: 'Foto familiar' })).toHaveCount(0)
    await expect(page.getByText('Todavía no hay fotos')).toBeVisible()
    expect((await page.request.get(`/api/archivos/${path}`)).status()).toBe(404)
  })

  test(`${rol}: borrar una fecha del calendario`, async ({ page }) => {
    await page.clock.install()
    await resetear(page, { hoy: HOY, datos: { fechas: [
      { nombre: 'Ana', tipo: 'cumple', dia: '11-25' }, { nombre: 'Luis', tipo: 'otra', dia: '12-03' },
    ] } })
    await entrarComo(page, rol)
    await page.goto('/calendario')
    const fila = page.getByRole('region', { name: 'Diciembre' }).getByRole('listitem').filter({ hasText: 'Luis' })
    await pasan5s(page, await borrar(page, fila, 'Luis'))
    await page.reload()
    await expect(page.getByText('Luis')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Noviembre' })).toContainText('Ana')
  })

  test(`${rol}: borrar persona, historial y servicio de una casa`, async ({ page }) => {
    await page.clock.install()
    await resetear(page, { hoy: HOY, datos: {
      personasCasa: [{ casa: 'portofino', nombre: 'Rosa Díaz', rol: 'Limpieza' }, { casa: 'portofino', nombre: 'Juan', rol: 'Jardín' }],
      eventosCasa: [{ casa: 'portofino', que: 'Pintaron el frente', cuando: '2026-11-20' }],
      serviciosCasa: [{ casa: 'portofino', clave: 'DirecTV', valor: 'Cliente 123456' }],
    } })
    await entrarComo(page, rol)
    await page.goto('/casas?casa=portofino')
    const item = (t: string) => page.getByRole('listitem').filter({ hasText: t })
    // borrar otra cosa antes de los 5 s borra ya la anterior
    await borrar(page, item('Rosa Díaz'), 'Rosa Díaz')
    await expect(page.getByText('Juan')).toBeVisible()
    await borrar(page, item('Pintaron el frente'), 'Pintaron el frente')
    await pasan5s(page, await borrar(page, item('DirecTV'), 'DirecTV'))
    await expect(page.getByText('Todavía no hay servicios cargados')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Rosa Díaz')).toHaveCount(0)
    await expect(page.getByText('Pintaron el frente')).toHaveCount(0)
    await expect(page.getByText('DirecTV')).toHaveCount(0)
    await expect(page.getByText('Juan')).toBeVisible()
  })
}

test('Deshacer devuelve la fila y no borra nada', async ({ page }) => {
  await page.clock.install()
  await resetear(page, { hoy: HOY, datos: { fechas: [{ nombre: 'Ana', tipo: 'cumple', dia: '11-25' }] } })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  const fila = page.getByRole('region', { name: 'Noviembre' }).getByRole('listitem').filter({ hasText: 'Ana' })
  const aviso = await borrar(page, fila, 'Ana')
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(aviso).toHaveCount(0)
  await expect(fila).toBeVisible()
  await page.clock.fastForward(6_000)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Noviembre' })).toContainText('Ana')
})

test('si ya lo borró otro, avisa en castellano y la fila vuelve', async ({ page }) => {
  await page.clock.install()
  await resetear(page, { hoy: HOY, datos: { serviciosCasa: [{ casa: 'portofino', clave: 'OSE', valor: '1' }] } })
  await entrarComo(page, 'familia')
  await page.goto('/casas?casa=portofino')
  const fila = page.getByRole('listitem').filter({ hasText: 'OSE' })
  await borrar(page, fila, 'OSE')
  await resetear(page, { hoy: HOY })
  await page.clock.fastForward(5_100)
  await expect(page.getByRole('alert').filter({ hasText: 'Ese servicio ya no está.' })).toBeVisible()
  await expect(fila).toBeVisible()
})

test('vencimientos: Hecho muestra "Marcado como hecho" y Deshacer lo devuelve', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { vencimientos: [
    { titulo: 'Balance anual', ambito: 'empresa', fecha: '2026-11-25', avisarDiasAntes: 7, hecho: false },
  ] } })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  const fila = page.getByRole('listitem').filter({ hasText: 'Balance anual' })
  const tildar = fila.getByRole('checkbox', { name: 'Marcar Balance anual como hecho' })
  await hidratado(tildar)
  await tildar.check()
  const aviso = page.getByRole('status').filter({ hasText: 'Marcado como hecho' })
  await expect(aviso).toContainText('Balance anual')
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(aviso).toHaveCount(0)
  await expect(tildar).toBeVisible()
  await expect(tildar).not.toBeChecked()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Marcar Balance anual como hecho' })).toBeVisible()
})

test('vencimientos: el Deshacer se va solo a los 10 segundos', async ({ page }) => {
  await page.clock.install()
  await resetear(page, { hoy: HOY, datos: { vencimientos: [
    { titulo: 'Balance anual', ambito: 'empresa', fecha: '2026-11-25', avisarDiasAntes: 7, hecho: false },
  ] } })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  const tildar = page.getByRole('checkbox', { name: 'Marcar Balance anual como hecho' })
  await hidratado(tildar)
  await tildar.check()
  const aviso = page.getByRole('status').filter({ hasText: 'Marcado como hecho' })
  await expect(aviso).toBeVisible()
  await page.clock.fastForward(9_000)
  await expect(aviso).toBeVisible()
  await page.clock.fastForward(1_500)
  await expect(aviso).toHaveCount(0)
  await expect(page.getByText('Balance anual')).toHaveCount(0)
})
