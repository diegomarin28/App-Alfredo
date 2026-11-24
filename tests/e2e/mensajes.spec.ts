import { expect, test } from '@playwright/test'
import { entrarComo, leerPortapapeles, permitirPortapapeles, resetear } from './helpers'
import { waLink } from '../../src/domain/telefono'

const ESTILO = 'Escribo corto y con "dale" al final.'

async function guion(page: import('@playwright/test').Page, respuestas: { texto: string }[]) {
  const r = await page.request.post('/api/test/ai', { data: { respuestas } })
  expect(r.status()).toBe(200)
}

test.beforeEach(async ({ page }) => {
  await resetear(page, { config: { nombre: 'Alfredo', estiloEscritura: ESTILO } })
  await entrarComo(page, 'owner')
})

test('Me escribieron: sugiere respuesta con Copiar, WhatsApp, Más formal y Otra versión', async ({ page, context, browserName }) => {
  await permitirPortapapeles(context, browserName)
  await guion(page, [{ texto: '"Dale Martín, el viernes cerramos."' }, { texto: 'Estimado Martín, el viernes cerramos.' }, { texto: 'Martín, cerremos el viernes.' }])
  await page.goto('/mensajes')
  await page.getByRole('radio', { name: 'Me escribieron' }).click()
  await page.getByLabel('Pegá el mensaje que te mandaron').fill('Hola Alfredo, ¿cerramos el viernes?')
  await page.getByRole('button', { name: 'Sugerir respuesta' }).click()

  const resultado = page.getByLabel('Mensaje sugerido')
  await expect(resultado).toHaveValue('Dale Martín, el viernes cerramos.')
  const whatsapp = page.getByRole('link', { name: 'Enviar por WhatsApp' })
  await expect(whatsapp).toHaveAttribute('href', waLink('Dale Martín, el viernes cerramos.'))
  // ícono + "WhatsApp", en una sola línea
  await expect(whatsapp).toHaveText('WhatsApp')
  await expect(whatsapp.locator('svg')).toBeVisible()
  expect((await whatsapp.boundingBox())!.height).toBeLessThanOrEqual(52) // 48 px: una sola línea

  const llamadas = (await (await page.request.get('/api/test/ai-llamadas')).json()).llamadas
  expect(llamadas[0].sistema).toContain(ESTILO)
  expect(llamadas[0].sistema).toContain('Tono por defecto: formal')
  expect(llamadas[0].sistema).toContain('Nunca uses emojis')
  expect(llamadas[0].mensajes[0].texto).toContain('Hola Alfredo, ¿cerramos el viernes?')

  // el enlace sigue las ediciones
  await resultado.fill('Dale, editado')
  await expect(page.getByRole('link', { name: 'Enviar por WhatsApp' })).toHaveAttribute('href', waLink('Dale, editado'))

  await page.getByRole('button', { name: 'Copiar' }).click()
  await expect(page.getByRole('button', { name: 'Copiado' })).toBeVisible()
  expect(await leerPortapapeles(page)).toBe('Dale, editado')

  await page.getByRole('button', { name: 'Más formal' }).click()
  await expect(resultado).toHaveValue('Estimado Martín, el viernes cerramos.')
  const l2 = (await (await page.request.get('/api/test/ai-llamadas')).json()).llamadas
  expect(l2[1].mensajes[0].texto).toContain('Reescribí este mensaje más formal: <mensaje_anterior>Dale, editado</mensaje_anterior>')

  await page.getByRole('button', { name: 'Otra versión' }).click()
  await expect(resultado).toHaveValue('Martín, cerremos el viernes.')
})

test('Quiero escribir: destinatario e idea llegan al prompt', async ({ page }) => {
  await guion(page, [{ texto: 'Hola Lucía, ¿me pasás el presupuesto?' }])
  await page.goto('/mensajes')
  await page.getByRole('radio', { name: 'Quiero escribir' }).click()
  await page.getByLabel('¿A quién?').fill('Lucía Gómez')
  await page.getByLabel('¿Qué le querés decir?').fill('que me pase el presupuesto')
  await page.getByRole('button', { name: 'Escribir mensaje' }).click()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveValue('Hola Lucía, ¿me pasás el presupuesto?')
  const llamadas = (await (await page.request.get('/api/test/ai-llamadas')).json()).llamadas
  const u = llamadas[0].mensajes[0].texto
  expect(u).toContain('Lucía Gómez')
  expect(u).toContain('que me pase el presupuesto')
})

test('sin saldo: mensaje amable, sin caerse', async ({ page }) => {
  await resetear(page, { datos: { usoIa: [{ tokensIn: 0, tokensOut: 0, costoUsd: 25 }] }, config: { nombre: 'Alfredo' } })
  await page.goto('/mensajes')
  await page.getByRole('radio', { name: 'Me escribieron' }).click()
  await page.getByLabel('Pegá el mensaje que te mandaron').fill('Hola')
  await page.getByRole('button', { name: 'Sugerir respuesta' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Se terminó el saldo de la IA, avisale a Diego.' })).toBeVisible()
  await expect(page.getByLabel('Mensaje sugerido')).toHaveCount(0)
})

test('familia no puede usar la API', async ({ page }) => {
  await entrarComo(page, 'familia')
  const r = await page.request.post('/api/ai/mensajes', { data: { modo: 'responder', mensaje: 'x' } })
  expect(r.status()).toBe(403)
})

test('validación: cuerpo inválido da 400 en español', async ({ page }) => {
  const r = await page.request.post('/api/ai/mensajes', { data: { modo: 'responder', mensaje: '' } })
  expect(r.status()).toBe(400)
  expect((await r.json()).error).toMatch(/mensaje/i)
})
