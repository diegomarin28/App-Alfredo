import { expect, test } from '@playwright/test'
import { resetear } from './helpers'

test('ruta de pruebas de la IA falsa: cola, llamadas y 404 sin la compuerta', async ({ request }) => {
  await resetear(request)
  const mal = await request.post('/api/test/ai', { data: { respuestas: 'no' } })
  expect(mal.status()).toBe(400)
  const ok = await request.post('/api/test/ai', { data: { respuestas: [{ texto: 'hola' }] } })
  expect(ok.status()).toBe(200)
  const r = await request.get('/api/test/ai-llamadas')
  expect(r.status()).toBe(200)
  expect(await r.json()).toEqual({ llamadas: [], mails: [] })
  expect((await request.get('/api/test/otra')).status()).toBe(404)
})
