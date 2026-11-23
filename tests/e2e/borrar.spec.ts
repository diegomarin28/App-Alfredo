import { test, expect, type Page } from '@playwright/test'
import { entrarComo, hidratado, resetear } from './helpers'

const HOY = '2026-11-22'

/** Toca Borrar en la fila, revisa la pregunta y confirma. */
async function borrar(page: Page, fila: ReturnType<Page['getByRole']>, pregunta: string) {
  const boton = fila.getByRole('button', { name: 'Borrar' })
  await hidratado(boton)
  expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await boton.click()
  const dialogo = page.getByRole('alertdialog', { name: pregunta })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await dialogo.getByRole('button', { name: 'Sí, borrar' }).click()
  await expect(dialogo).toHaveCount(0)
}

for (const rol of ['owner', 'familia'] as const) {
  test(`${rol}: borrar una foto saca la fila y el archivo`, async ({ page }) => {
    await resetear(page, { hoy: HOY })
    await entrarComo(page, rol)
    const subida = await page.request.post('/api/archivos', {
      multipart: { tipo: 'foto', file: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('abc') } },
    })
    expect(subida.status()).toBe(200)
    const { path } = (await subida.json()) as { path: string }
    expect((await page.request.get(`/api/archivos/${path}`)).status()).toBe(200)

    await page.goto('/fotos')
    const fila = page.getByRole('listitem').filter({ has: page.getByRole('img', { name: 'Foto familiar' }) })
    await expect(fila).toHaveCount(1)
    await borrar(page, fila, '¿Borrar esta foto?')
    await expect(page.getByRole('img', { name: 'Foto familiar' })).toHaveCount(0)
    await expect(page.getByText('Todavía no hay fotos')).toBeVisible()
    expect((await page.request.get(`/api/archivos/${path}`)).status()).toBe(404)
  })

  test(`${rol}: borrar una fecha del calendario`, async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: { fechas: [
      { nombre: 'Ana', tipo: 'cumple', dia: '11-25' }, { nombre: 'Luis', tipo: 'aniversario', dia: '12-03' },
    ] } })
    await entrarComo(page, rol)
    await page.goto('/calendario')
    const fila = page.getByRole('region', { name: 'Diciembre' }).getByRole('listitem').filter({ hasText: 'Luis' })
    await borrar(page, fila, '¿Borrar la fecha de Luis?')
    await expect(page.getByText('Luis')).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Luis')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Noviembre' })).toContainText('Ana')
  })

  test(`${rol}: borrar persona, historial y servicio de una casa`, async ({ page }) => {
    await resetear(page, { hoy: HOY, datos: {
      personasCasa: [{ casa: 'portofino', nombre: 'Rosa Díaz', rol: 'Limpieza' }, { casa: 'portofino', nombre: 'Juan', rol: 'Jardín' }],
      eventosCasa: [{ casa: 'portofino', que: 'Pintaron el frente', cuando: '2026-11-20' }],
      serviciosCasa: [{ casa: 'portofino', clave: 'DirecTV', valor: 'Cliente 123456' }],
    } })
    await entrarComo(page, rol)
    await page.goto('/casas?casa=portofino')
    await borrar(page, page.getByRole('listitem').filter({ hasText: 'Rosa Díaz' }), '¿Borrar a Rosa Díaz?')
    await expect(page.getByText('Rosa Díaz')).toHaveCount(0)
    await expect(page.getByText('Juan')).toBeVisible()
    await borrar(page, page.getByRole('listitem').filter({ hasText: 'Pintaron el frente' }), '¿Borrar «Pintaron el frente» del historial?')
    await expect(page.getByText('Todavía no hay nada en el historial')).toBeVisible()
    await borrar(page, page.getByRole('listitem').filter({ hasText: 'DirecTV' }), '¿Borrar DirecTV?')
    await expect(page.getByText('Todavía no hay servicios cargados')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Rosa Díaz')).toHaveCount(0)
    await expect(page.getByText('Pintaron el frente')).toHaveCount(0)
    await expect(page.getByText('DirecTV')).toHaveCount(0)
  })
}

test('Cancelar no borra nada', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { fechas: [{ nombre: 'Ana', tipo: 'cumple', dia: '11-25' }] } })
  await entrarComo(page, 'owner')
  await page.goto('/calendario')
  const boton = page.getByRole('region', { name: 'Fechas' }).getByRole('button', { name: 'Borrar' })
  await hidratado(boton)
  await boton.click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Fechas' })).toContainText('Ana')
})

test('si ya lo borró otro, avisa en castellano', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { serviciosCasa: [{ casa: 'portofino', clave: 'OSE', valor: '1' }] } })
  await entrarComo(page, 'familia')
  await page.goto('/casas?casa=portofino')
  const boton = page.getByRole('listitem').filter({ hasText: 'OSE' }).getByRole('button', { name: 'Borrar' })
  await hidratado(boton)
  await boton.click()
  await resetear(page, { hoy: HOY })
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, borrar' }).click()
  await expect(page.getByRole('alertdialog').getByRole('alert')).toHaveText('Ese servicio ya no está.')
})

test('vencimientos: Hecho muestra "Marcado como hecho" y Deshacer lo devuelve', async ({ page }) => {
  await resetear(page, { hoy: HOY, datos: { vencimientos: [
    { titulo: 'Balance anual', ambito: 'empresa', fecha: '2026-11-25', avisarDiasAntes: 7, hecho: false },
  ] } })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  const fila = page.getByRole('listitem').filter({ hasText: 'Balance anual' })
  await hidratado(fila.getByRole('button', { name: 'Hecho' }))
  await fila.getByRole('button', { name: 'Hecho' }).click()
  const aviso = page.getByRole('status').filter({ hasText: 'Marcado como hecho' })
  await expect(aviso).toContainText('Balance anual')
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(aviso).toHaveCount(0)
  await expect(fila.getByRole('button', { name: 'Hecho' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Balance anual' }).getByRole('button', { name: 'Hecho' })).toBeVisible()
})

test('vencimientos: el Deshacer se va solo a los 10 segundos', async ({ page }) => {
  await page.clock.install()
  await resetear(page, { hoy: HOY, datos: { vencimientos: [
    { titulo: 'Balance anual', ambito: 'empresa', fecha: '2026-11-25', avisarDiasAntes: 7, hecho: false },
  ] } })
  await entrarComo(page, 'owner')
  await page.goto('/vencimientos')
  const boton = page.getByRole('button', { name: 'Hecho' })
  await hidratado(boton)
  await boton.click()
  const aviso = page.getByRole('status').filter({ hasText: 'Marcado como hecho' })
  await expect(aviso).toBeVisible()
  await page.clock.fastForward(9_000)
  await expect(aviso).toBeVisible()
  await page.clock.fastForward(1_500)
  await expect(aviso).toHaveCount(0)
  await expect(page.getByText('Balance anual')).toHaveCount(0)
})
