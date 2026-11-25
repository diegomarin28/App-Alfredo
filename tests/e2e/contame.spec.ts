import { expect, test } from '@playwright/test'
import { decir, entrarComo, guion, instalarVozFalsa, resetear } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetear(page, {
    hoy: '2026-11-22',
    datos: {
      personasCasa: [
        { casa: 'portofino', nombre: 'Simón', rol: 'Jardinero' },
        { casa: 'malibu', nombre: 'Raúl', rol: 'Jardinero' },
      ],
    },
  })
  await entrarComo(page, 'owner')
})

test('dictar, corregir, responder la pregunta, guardar en la casa y deshacer', async ({ page, context }) => {
  await page.addInitScript(instalarVozFalsa)
  await guion(page, [
    {
      texto: '',
      toolName: 'preguntar',
      toolInput: {
        pregunta: '¿Es en Portofino, en Malibú, o es otra cosa?',
        opciones: [{ etiqueta: 'Portofino', respuesta: 'Es en Portofino' }, { etiqueta: 'Malibú', respuesta: 'Es en Malibú' }],
      },
    },
    {
      texto: '',
      toolName: 'guardar',
      toolInput: { acciones: [{ tipo: 'eventoCasa', casa: 'malibu', que: 'Le pagué al jardinero 2000 pesos', cuando: '2026-11-21' }] },
    },
  ])
  await page.goto('/contame')
  await expect(page.getByRole('heading', { name: 'Contame' })).toBeVisible()

  await page.getByRole('button', { name: 'Tocá para hablar' }).click()
  await expect(page.getByRole('button', { name: 'Tocá para terminar' })).toBeVisible()
  await decir(page, 'Ayer le pagué', false)
  await expect(page.getByText('Ayer le pagué')).toBeVisible()
  await decir(page, 'Ayer le pagué al jardinero')
  // corte de Safari en la pausa: se reinicia solo y sigue acumulando
  await page.evaluate(() => (window as unknown as { __voz: { cortar(): void } }).__voz.cortar())
  expect(await page.evaluate(() => (window as unknown as { __voz: { starts(): number } }).__voz.starts())).toBe(2)
  await decir(page, 'dos mil pesos')
  await page.getByRole('button', { name: 'Tocá para terminar' }).click()

  const caja = page.getByLabel('Lo que escuché · podés corregirlo')
  await expect(caja).toHaveValue('Ayer le pagué al jardinero dos mil pesos')
  await caja.fill('Ayer le pagué al jardinero 2000 pesos')
  await expect(page.getByRole('button', { name: 'Repetir' })).toBeVisible()
  await page.getByRole('button', { name: 'Enviar' }).click()

  await expect(page.getByText('¿Es en Portofino, en Malibú, o es otra cosa?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Otra cosa · guardar en Tareas pendientes' })).toBeVisible()
  await page.getByRole('button', { name: 'Malibú', exact: true }).click()

  // ronda 6: primero "Esto es lo que entendí"; nada se guarda hasta "Guardar todo"
  await expect(page.getByRole('heading', { name: 'Esto es lo que entendí' })).toBeVisible()
  await expect(page.locator('[data-fila]')).toContainText(['Le pagué al jardinero 2000 pesos (21 de noviembre)Historial de Malibú'])
  await page.getByRole('button', { name: 'Guardar todo' }).click()
  await expect(page.getByText('Listo, lo guardé:')).toBeVisible()
  await expect(page.getByText('Historial de Malibú: Le pagué al jardinero 2000 pesos (21 de noviembre)')).toBeVisible()

  const llamadas = (await (await page.request.get('/api/test/ai-llamadas')).json()).llamadas
  expect(llamadas).toHaveLength(2)
  expect(llamadas[0].mensajes[0].texto).toContain('<dictado>Ayer le pagué al jardinero 2000 pesos</dictado>')
  expect(llamadas[1].mensajes[0].texto).toContain('<respuesta>Es en Malibú</respuesta>')

  // aparece en la casa
  const casas = await context.newPage()
  await casas.goto('/casas?casa=malibu')
  await expect(casas.getByText('Le pagué al jardinero 2000 pesos')).toBeVisible()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Listo, lo deshice.')).toBeVisible()
  await casas.reload()
  await expect(casas.getByRole('heading', { name: 'Historial' })).toBeVisible()
  await expect(casas.getByText('Le pagué al jardinero 2000 pesos')).toHaveCount(0)

  await page.getByRole('button', { name: 'Contar otra cosa' }).click()
  await expect(page.getByRole('button', { name: 'Tocá para hablar' })).toBeVisible()
})

test('"Otra cosa" guarda en Tareas pendientes sin otra llamada a la IA', async ({ page }) => {
  await page.addInitScript(instalarVozFalsa)
  await guion(page, [{
    texto: '',
    toolName: 'preguntar',
    toolInput: { pregunta: '¿Es en Portofino, en Malibú, o es otra cosa?', opciones: [{ etiqueta: 'Portofino', respuesta: 'Es en Portofino' }] },
  }])
  await page.goto('/contame')
  await page.getByRole('button', { name: 'Prefiero escribir' }).click()
  await page.getByLabel('Escribí o dictá con el teclado').fill('Arreglar la canilla')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await page.getByRole('button', { name: 'Otra cosa · guardar en Tareas pendientes' }).click()
  await page.getByRole('button', { name: 'Guardar todo' }).click()
  await expect(page.getByText('Tareas pendientes: Arreglar la canilla')).toBeVisible()
  const llamadas = (await (await page.request.get('/api/test/ai-llamadas')).json()).llamadas
  expect(llamadas).toHaveLength(1)
  // como Alfredo, por el menú: lo guardado tiene que estar (no lo de antes de guardar)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('navigation', { name: 'Accesos directos' }).getByRole('link', { name: 'Tareas pendientes' }).click()
  await expect(page.getByText('Arreglar la canilla')).toBeVisible()
})

test('sin reconocimiento de voz: se puede escribir o pegar', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
  })
  await guion(page, [{ texto: '', toolName: 'guardar', toolInput: { acciones: [{ tipo: 'pendiente', texto: 'Comprar pilas' }] } }])
  await page.goto('/contame')
  await expect(page.getByRole('button', { name: 'Tocá para hablar' })).toHaveCount(0)
  await page.getByLabel('Escribí o dictá con el teclado').fill('Comprar pilas')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await page.getByRole('button', { name: 'Guardar todo' }).click()
  await expect(page.getByText('Tareas pendientes: Comprar pilas')).toBeVisible()
})

test('permiso de micrófono denegado: aviso claro, sin perder lo dictado', async ({ page }) => {
  await page.addInitScript(instalarVozFalsa)
  await page.goto('/contame')
  await page.getByRole('button', { name: 'Tocá para hablar' }).click()
  await decir(page, 'Comprar pilas')
  await page.evaluate(() => (window as unknown as { __voz: { error(c: string): void } }).__voz.error('not-allowed'))
  await expect(page.getByRole('alert').filter({ hasText: 'Falta el permiso del micrófono' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tocá para hablar' })).toBeVisible()
  await expect(page.getByText('Comprar pilas')).toBeVisible()
  await page.getByRole('button', { name: 'Revisar y enviar' }).click()
  await expect(page.getByLabel('Lo que escuché · podés corregirlo')).toHaveValue('Comprar pilas')
})

test('sin conexión: deja de escuchar y avisa (no se queda reiniciando)', async ({ page }) => {
  await page.addInitScript(instalarVozFalsa)
  await page.goto('/contame')
  await page.getByRole('button', { name: 'Tocá para hablar' }).click()
  await page.evaluate(() => (window as unknown as { __voz: { error(c: string): void } }).__voz.error('network'))
  await expect(page.getByRole('alert').filter({ hasText: 'No pude escuchar. Revisá la conexión y probá de nuevo.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tocá para hablar' })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { __voz: { starts(): number } }).__voz.starts())).toBe(1)
})

test('respuesta de la IA cortada: propone todo como nota y lo avisa', async ({ page }) => {
  await page.addInitScript(instalarVozFalsa)
  await guion(page, [{
    texto: '',
    toolName: 'guardar',
    toolInput: { acciones: [{ tipo: 'eventoCasa', casa: 'portofino', que: 'Primera cosa', cuando: '2026-11-22' }] },
    stopReason: 'max_tokens',
  }])
  await page.goto('/contame')
  await page.getByRole('button', { name: 'Prefiero escribir' }).click()
  await page.getByLabel('Escribí o dictá con el teclado').fill('Primera cosa en Portofino. Segunda cosa en Malibú.')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'nota' })).toContainText('revis')
  await page.getByRole('button', { name: 'Guardar todo' }).click()
  await expect(page.getByText('Listo, lo guardé:')).toBeVisible()
  await expect(page.getByText('Notas: Primera cosa en Portofino. Segunda cosa en Malibú.')).toBeVisible()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Casas' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Casas' })).toBeVisible()
  await expect(page.getByText('Primera cosa', { exact: true })).toHaveCount(0)
})

test('sin saldo: mensaje amable', async ({ page }) => {
  await resetear(page, { hoy: '2026-11-22', datos: { usoIa: [{ tokensIn: 0, tokensOut: 0, costoUsd: 25 }] } })
  await page.addInitScript(instalarVozFalsa)
  await page.goto('/contame')
  await page.getByRole('button', { name: 'Prefiero escribir' }).click()
  await page.getByLabel('Escribí o dictá con el teclado').fill('Hola')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Se terminó el saldo de la IA, avisale a Diego.' })).toBeVisible()
})

test('APIs: familia 403, validación 400, deshacer con lote inválido 400', async ({ page }) => {
  let r = await page.request.post('/api/ai/contame', { data: { texto: '' } })
  expect(r.status()).toBe(400)
  r = await page.request.post('/api/ai/contame', { data: { texto: 'x'.repeat(8001) } })
  expect(r.status()).toBe(400)
  r = await page.request.post('/api/ai/contame', { data: { texto: 'hola', respuestas: ['a', 'b', 'c', 'd'] } })
  expect(r.status()).toBe(400)
  r = await page.request.post('/api/contame/deshacer', { data: { loteId: 'no-es-uuid' } })
  expect(r.status()).toBe(400)
  // ronda 6: "Guardar todo" valida de nuevo lo que llega del teléfono
  r = await page.request.post('/api/contame/guardar', { data: { acciones: 'no' } })
  expect(r.status()).toBe(400)
  r = await page.request.post('/api/contame/guardar', { data: { acciones: [{ tipo: 'vencimiento', titulo: 'X', ambito: 'empresa', fecha: 'mal' }] } })
  expect(r.status()).toBe(400)
  await entrarComo(page, 'familia')
  r = await page.request.post('/api/contame/guardar', { data: { acciones: [{ tipo: 'pendiente', texto: 'x' }] } })
  expect(r.status()).toBe(403)
  r = await page.request.post('/api/ai/contame', { data: { texto: 'hola' } })
  expect(r.status()).toBe(403)
  r = await page.request.post('/api/contame/deshacer', { data: { loteId: crypto.randomUUID() } })
  expect(r.status()).toBe(403)
})
