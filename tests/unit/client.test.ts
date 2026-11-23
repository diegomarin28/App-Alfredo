// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

import { AnthropicClient, FakeAiClient, MODELO_CONTAME, MODELO_MENSAJES } from '@/ai/client'
import { clasificar } from '@/ai/contame'
import { construirSistema as sistemaContame, HERRAMIENTAS } from '@/ai/contamePrompt'
import { FakeEmailSender } from '@/ai/email'
import { construirSistema as sistemaMensajes, generarMensaje } from '@/ai/mensajes'
import { MemoryRepo } from '@/data/memoryRepo'

beforeEach(() => create.mockReset())
afterEach(() => vi.unstubAllEnvs())

const uso = { input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: null, cache_read_input_tokens: null }
const respuesta = (stop_reason: string, content: unknown[], usage: Record<string, unknown> = uso) => ({ stop_reason, content, usage })
const base = { sistema: 's', mensajes: [{ rol: 'user' as const, texto: 'x' }], maxTokens: 5 }

describe('AnthropicClient', () => {
  it('expone stop_reason como stopReason junto con la herramienta', async () => {
    create.mockResolvedValue(respuesta('max_tokens', [{ type: 'tool_use', id: 't1', name: 'guardar', input: { acciones: [] } }]))
    const r = await new AnthropicClient('k').completar({ ...base, modelo: MODELO_MENSAJES })
    expect(r).toMatchObject({ stopReason: 'max_tokens', toolName: 'guardar', toolInput: { acciones: [] }, tokensIn: 10, tokensOut: 20 })
  })

  it('usa el modelo de cada llamada y devuelve los tokens de caché (null → 0)', async () => {
    create.mockResolvedValueOnce(respuesta('end_turn', [{ type: 'text', text: 'a' }]))
    create.mockResolvedValueOnce(respuesta('end_turn', [{ type: 'text', text: 'b' }],
      { input_tokens: 7, output_tokens: 3, cache_creation_input_tokens: 600, cache_read_input_tokens: 900 }))
    create.mockResolvedValueOnce(respuesta('end_turn', [{ type: 'text', text: 'c' }], { input_tokens: 1, output_tokens: 1 }))
    const ai = new AnthropicClient('k')
    const a = await ai.completar({ ...base, modelo: MODELO_MENSAJES })
    const b = await ai.completar({ ...base, modelo: MODELO_CONTAME })
    const c = await ai.completar({ ...base, modelo: MODELO_CONTAME })
    expect(create.mock.calls.map((x) => x[0].model)).toEqual(['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-haiku-5-5'])
    expect(a).toMatchObject({ modelo: 'claude-sonnet-5-5', tokensIn: 10, tokensOut: 20, tokensCacheWrite: 0, tokensCacheRead: 0 })
    expect(b).toMatchObject({ modelo: 'claude-haiku-5-5', tokensIn: 7, tokensOut: 3, tokensCacheWrite: 600, tokensCacheRead: 900 })
    expect(c).toMatchObject({ tokensCacheWrite: 0, tokensCacheRead: 0 })
  })

  it('el system va siempre como un solo bloque de texto con caché (5 minutos)', async () => {
    create.mockResolvedValue(respuesta('end_turn', [{ type: 'text', text: 'hola' }]))
    await new AnthropicClient('k').completar({ ...base, sistema: 'Sos útil.', modelo: MODELO_CONTAME })
    expect(create.mock.calls[0][0].system).toEqual([{ type: 'text', text: 'Sos útil.', cache_control: { type: 'ephemeral' } }])
  })

  it('sin pensar: Sonnet 5.5 manda thinking between_tools (sin otros campos); por defecto no manda thinking', async () => {
    create.mockResolvedValue(respuesta('end_turn', [{ type: 'text', text: 'hola' }]))
    const ai = new AnthropicClient('k')
    await ai.completar({ ...base, modelo: MODELO_MENSAJES, sinPensar: true })
    await ai.completar({ ...base, modelo: MODELO_MENSAJES })
    expect(create.mock.calls[0][0].thinking).toEqual({ type: 'between_tools' })
    expect('thinking' in create.mock.calls[1][0]).toBe(false)
  })

  it('sin pensar en Haiku 5.5: thinking disabled', async () => {
    create.mockResolvedValue(respuesta('end_turn', [{ type: 'text', text: 'hola' }]))
    await new AnthropicClient('k').completar({ ...base, modelo: MODELO_CONTAME, sinPensar: true })
    expect(create.mock.calls[0][0].thinking).toEqual({ type: 'disabled' })
  })

  it('unaSolaHerramienta: tool_choice auto sin llamadas en paralelo (Sonnet 5.5 no acepta forzar)', async () => {
    create.mockResolvedValue(respuesta('end_turn', [{ type: 'text', text: 'hola' }]))
    const r = await new AnthropicClient('k').completar({
      ...base, modelo: MODELO_MENSAJES, forzarHerramienta: true,
      herramientas: [{ name: 'guardar', description: 'd', input_schema: { type: 'object' } }], unaSolaHerramienta: true,
    })
    expect(r.stopReason).toBe('end_turn')
    expect(r.texto).toBe('hola')
    expect(create.mock.calls[0][0].tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true })
  })

  it('una respuesta que empieza con bloques thinking se lee por tipo (texto y herramienta)', async () => {
    create.mockResolvedValueOnce(respuesta('end_turn', [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: 'Dale, ' },
      { type: 'text', text: 'nos vemos.' },
    ]))
    create.mockResolvedValueOnce(respuesta('tool_use', [
      { type: 'thinking', thinking: 'pensando', signature: 'sig' },
      { type: 'redacted_thinking', data: 'xx' },
      { type: 'tool_use', id: 't1', name: 'preguntar', input: { pregunta: '¿Dónde?', opciones: [] } },
    ]))
    const ai = new AnthropicClient('k')
    expect(await ai.completar({ ...base, modelo: MODELO_MENSAJES })).toMatchObject({ texto: 'Dale, nos vemos.' })
    const t = await ai.completar({ ...base, modelo: MODELO_CONTAME })
    expect(t).toMatchObject({ texto: '', toolName: 'preguntar', toolInput: { pregunta: '¿Dónde?', opciones: [] }, stopReason: 'tool_use' })
  })
})

describe('pedido real a la API (SDK simulado)', () => {
  const ctx = { hoy: '2026-11-22', personas: [], contactos: [] }

  it('Contame: Haiku 5.5, 2000 tokens, herramienta forzada (any, una sola), guardar/preguntar y system con caché', async () => {
    const acciones = [{ tipo: 'pendiente', texto: 'Llamar al plomero' }]
    create.mockResolvedValue(respuesta('tool_use', [{ type: 'tool_use', id: 't1', name: 'guardar', input: { acciones } }],
      { input_tokens: 300, output_tokens: 80, cache_creation_input_tokens: 0, cache_read_input_tokens: 2500 }))
    const repo = new MemoryRepo()
    const c = await clasificar(repo, new AnthropicClient('k'), new FakeEmailSender(), 'Llamar al plomero', [], ctx)
    expect(c).toEqual({ acciones })
    const pedido = create.mock.calls[0][0]
    expect(pedido).toMatchObject({
      model: 'claude-haiku-5-5',
      max_tokens: 2000,
      tool_choice: { type: 'any', disable_parallel_tool_use: true },
      system: [{ type: 'text', text: sistemaContame('Alfredo'), cache_control: { type: 'ephemeral' } }],
    })
    expect(pedido.tools).toEqual(HERRAMIENTAS)
    expect(pedido.tools.map((t: { name: string }) => t.name)).toEqual(['guardar', 'preguntar'])
    expect('thinking' in pedido).toBe(false)
    // el uso queda registrado con el precio de Haiku: entrada = sin caché + leída de caché
    const [u] = await repo.usoIa.list()
    expect(u.tokensIn).toBe(2800)
    expect(u.tokensOut).toBe(80)
    expect(u.costoUsd).toBeCloseTo((300 * 0.1 + 2500 * 0.01 + 80 * 0.5) / 1e6, 12)
  })

  it('Mensajes: Sonnet 5.5, 400 tokens, sin pensar (between_tools), sin tool_choice y system con caché', async () => {
    create.mockResolvedValue(respuesta('end_turn', [{ type: 'text', text: 'Dale, nos vemos.' }]))
    const repo = new MemoryRepo()
    await repo.setConfig({ nombre: 'Alfredo', estiloEscritura: 'Frases cortas.' })
    const t = await generarMensaje(repo, new AnthropicClient('k'), new FakeEmailSender(), { modo: 'responder', mensaje: 'Nos vemos?' })
    expect(t).toBe('Dale, nos vemos.')
    const pedido = create.mock.calls[0][0]
    expect(pedido).toMatchObject({
      model: 'claude-sonnet-5-5',
      max_tokens: 400,
      thinking: { type: 'between_tools' },
      system: [{ type: 'text', text: sistemaMensajes('Alfredo', 'Frases cortas.'), cache_control: { type: 'ephemeral' } }],
    })
    expect('tool_choice' in pedido).toBe(false)
    expect('tools' in pedido).toBe(false)
  })
})

describe('FakeAiClient', () => {
  it('stopReason se puede guionar; por defecto end_turn', async () => {
    const ai = new FakeAiClient([{ stopReason: 'max_tokens' }])
    expect((await ai.completar({ ...base, modelo: MODELO_CONTAME })).stopReason).toBe('max_tokens')
    expect((await ai.completar({ ...base, modelo: MODELO_CONTAME })).stopReason).toBe('end_turn')
  })

  it('caché en 0 por defecto y devuelve el modelo pedido', async () => {
    const ai = new FakeAiClient()
    expect(await ai.completar({ ...base, modelo: MODELO_CONTAME }))
      .toMatchObject({ modelo: 'claude-haiku-5-5', tokensIn: 100, tokensOut: 50, tokensCacheWrite: 0, tokensCacheRead: 0 })
    expect((await ai.completar({ ...base, modelo: MODELO_MENSAJES })).modelo).toBe('claude-sonnet-5-5')
  })
})
