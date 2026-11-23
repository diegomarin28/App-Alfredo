// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

import { AnthropicClient, FakeAiClient } from '@/ai/client'

beforeEach(() => create.mockReset())

const respuesta = (stop_reason: string, content: unknown[]) => ({ stop_reason, content, usage: { input_tokens: 10, output_tokens: 20 } })

describe('AnthropicClient', () => {
  it('expone stop_reason como stopReason junto con la herramienta', async () => {
    create.mockResolvedValue(respuesta('max_tokens', [{ type: 'tool_use', id: 't1', name: 'guardar', input: { acciones: [] } }]))
    const r = await new AnthropicClient('k', 'claude-sonnet-5-5').completar({ sistema: 's', mensajes: [{ rol: 'user', texto: 'x' }], maxTokens: 5 })
    expect(r).toMatchObject({ stopReason: 'max_tokens', toolName: 'guardar', toolInput: { acciones: [] }, tokensIn: 10, tokensOut: 20 })
  })

  it('unaSolaHerramienta: tool_choice auto sin llamadas en paralelo (el modelo no acepta forzar)', async () => {
    create.mockResolvedValue(respuesta('end_turn', [{ type: 'text', text: 'hola' }]))
    const r = await new AnthropicClient('k', 'claude-sonnet-5-5').completar({
      sistema: 's', mensajes: [{ rol: 'user', texto: 'x' }], maxTokens: 5,
      herramientas: [{ name: 'guardar', description: 'd', input_schema: { type: 'object' } }], unaSolaHerramienta: true,
    })
    expect(r.stopReason).toBe('end_turn')
    expect(r.texto).toBe('hola')
    expect(create.mock.calls[0][0].tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true })
  })
})

describe('FakeAiClient', () => {
  it('stopReason se puede guionar; por defecto end_turn', async () => {
    const ai = new FakeAiClient([{ stopReason: 'max_tokens' }])
    expect((await ai.completar({ sistema: '', mensajes: [], maxTokens: 1 })).stopReason).toBe('max_tokens')
    expect((await ai.completar({ sistema: '', mensajes: [], maxTokens: 1 })).stopReason).toBe('end_turn')
  })
})
