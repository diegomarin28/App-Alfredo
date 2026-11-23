// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'
import { FakeAiClient } from '@/ai/client'
import { FakeEmailSender } from '@/ai/email'
import { construirSistema, construirUsuario, generarMensaje, limpiarRespuesta } from '@/ai/mensajes'
import { getAi, getEmail, IaNoConfiguradaError } from '@/ai'

afterEach(() => vi.unstubAllEnvs())

describe('prompts', () => {
  it('el sistema incluye nombre y notas de estilo textuales', () => {
    const s = construirSistema('Alfredo', 'Soy directo y uso "che" a veces.')
    expect(s).toContain('Alfredo')
    expect(s).toContain('Soy directo y uso "che" a veces.')
    expect(s).toMatch(/WhatsApp/)
    expect(s).toMatch(/80 palabras/)
  })
  it('responder lleva el mensaje pegado textual', () => {
    const u = construirUsuario({ modo: 'responder', mensaje: 'Hola Alfredo, ¿el viernes   cerramos?' })
    expect(u).toContain('Hola Alfredo, ¿el viernes   cerramos?')
  })
  it('escribir lleva destinatario e idea', () => {
    const u = construirUsuario({ modo: 'escribir', destinatario: 'Martín', idea: 'pasar el presupuesto' })
    expect(u).toContain('Martín')
    expect(u).toContain('pasar el presupuesto')
  })
  it('variantes sobre el mensaje anterior', () => {
    const base = { modo: 'escribir' as const, destinatario: 'a', idea: 'b', anterior: 'Texto previo' }
    expect(construirUsuario({ ...base, variante: 'formal' })).toContain('Reescribí este mensaje más formal: Texto previo')
    expect(construirUsuario({ ...base, variante: 'otra' })).toContain('Dame otra versión distinta de: Texto previo')
  })
})

describe('limpiarRespuesta', () => {
  it.each([
    ['  hola  ', 'hola'],
    ['"Hola, ¿cómo estás?"', 'Hola, ¿cómo estás?'],
    ['“Hola”', 'Hola'],
    ['«Hola»', 'Hola'],
    ["'Hola'", 'Hola'],
    ['Acá va:\nHola Ana', 'Hola Ana'],
    ['Acá va:\n\n"Hola Ana"', 'Hola Ana'],
    ['Hola "che" Ana', 'Hola "che" Ana'],
  ])('%j -> %j', (entrada, esperado) => expect(limpiarRespuesta(entrada)).toBe(esperado))
})

describe('generarMensaje', () => {
  it('llama a la IA con estilo y mensaje, y devuelve el texto limpio', async () => {
    vi.stubEnv('AI_PRICE_INPUT_PER_MTOK', '3')
    vi.stubEnv('AI_PRICE_OUTPUT_PER_MTOK', '15')
    const repo = new MemoryRepo()
    await repo.setConfig({ nombre: 'Alfredo', estiloEscritura: 'Frases cortas.' })
    const ai = new FakeAiClient([{ texto: ' "Dale, nos vemos." ' }])
    const t = await generarMensaje(repo, ai, new FakeEmailSender(), { modo: 'responder', mensaje: 'Nos vemos?' })
    expect(t).toBe('Dale, nos vemos.')
    expect(ai.llamadas[0].sistema).toContain('Frases cortas.')
    expect(ai.llamadas[0].mensajes[0].texto).toContain('Nos vemos?')
    expect(ai.llamadas[0].maxTokens).toBeLessThanOrEqual(500)
  })
})

describe('getAi / getEmail en producción (R26)', () => {
  it('sin ANTHROPIC_API_KEY y sin AI_BACKEND=fake: error amable', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AI_BACKEND', '')
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const ai = getAi()
    await expect(ai.completar({ sistema: '', mensajes: [], maxTokens: 1 })).rejects.toThrow(
      'La IA no está configurada, avisale a Diego.',
    )
    await expect(ai.completar({ sistema: '', mensajes: [], maxTokens: 1 })).rejects.toBeInstanceOf(IaNoConfiguradaError)
  })
  it('AI_BACKEND=fake en producción usa el falso', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AI_BACKEND', 'fake')
    expect(getAi()).toBeInstanceOf(FakeAiClient)
  })
  it('sin RESEND_API_KEY en producción: console.error y lanza', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AI_BACKEND', '')
    vi.stubEnv('RESEND_API_KEY', '')
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(getEmail().enviar('a@b.c', 'x', 'y')).rejects.toThrow()
    expect(err).toHaveBeenCalled()
  })
  it('fuera de producción sin clave sigue usando el falso', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('AI_BACKEND', '')
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    expect(getAi()).toBeInstanceOf(FakeAiClient)
  })
})
