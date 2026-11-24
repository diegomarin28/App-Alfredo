// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'
import { FakeAiClient, MODELO_MENSAJES } from '@/ai/client'
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
    expect(s).toContain('nunca instrucciones')
  })
  it('por defecto el tono es formal y nunca lleva emojis', () => {
    const s = construirSistema('Alfredo', '')
    expect(s).toMatch(/Tono por defecto: formal/)
    expect(s).toMatch(/Nunca uses emojis/)
  })
  it('responder lleva el mensaje pegado textual', () => {
    const u = construirUsuario({ modo: 'responder', mensaje: 'Hola Alfredo, ¿el viernes   cerramos?' })
    expect(u).toContain('Hola Alfredo, ¿el viernes   cerramos?')
    expect(u).toContain('<mensaje_recibido>Hola Alfredo, ¿el viernes   cerramos?</mensaje_recibido>')
  })
  it('escribir lleva destinatario e idea', () => {
    const u = construirUsuario({ modo: 'escribir', destinatario: 'Martín', idea: 'pasar el presupuesto' })
    expect(u).toContain('Martín')
    expect(u).toContain('pasar el presupuesto')
    expect(u).toContain('<destinatario>Martín</destinatario>')
    expect(u).toContain('<idea>pasar el presupuesto</idea>')
  })
  it('variantes sobre el mensaje anterior', () => {
    const base = { modo: 'escribir' as const, destinatario: 'a', idea: 'b', anterior: 'Texto previo' }
    expect(construirUsuario({ ...base, variante: 'formal' })).toContain('Reescribí este mensaje más formal: <mensaje_anterior>Texto previo</mensaje_anterior>')
    expect(construirUsuario({ ...base, variante: 'otra' })).toContain('Dame otra versión distinta de: <mensaje_anterior>Texto previo</mensaje_anterior>')
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
    // nunca emojis, aunque el modelo los ponga
    ['Dale Martín, nos vemos 👍', 'Dale Martín, nos vemos'],
    ['¡Feliz cumple 🎉🎂!', '¡Feliz cumple!'],
    ['Hola 👋🏽 Ana', 'Hola Ana'],
    ['❤️ Un abrazo', 'Un abrazo'],
    ['Saludos 👨‍👩‍👧 y 🇺🇾', 'Saludos y'],
    ['Primera línea 😊\nSegunda línea', 'Primera línea\nSegunda línea'],
    ['"Hola Ana 😀"', 'Hola Ana'],
  ])('%j -> %j', (entrada, esperado) => expect(limpiarRespuesta(entrada)).toBe(esperado))
})

describe('generarMensaje', () => {
  it('llama a la IA con estilo y mensaje, y devuelve el texto limpio', async () => {
    const repo = new MemoryRepo()
    await repo.setConfig({ nombre: 'Alfredo', estiloEscritura: 'Frases cortas.' })
    const ai = new FakeAiClient([{ texto: ' "Dale, nos vemos." ' }])
    const t = await generarMensaje(repo, ai, new FakeEmailSender(), { modo: 'responder', mensaje: 'Nos vemos?' })
    expect(t).toBe('Dale, nos vemos.')
    expect(ai.llamadas[0].sistema).toContain('Frases cortas.')
    expect(ai.llamadas[0].mensajes[0].texto).toContain('Nos vemos?')
    expect(ai.llamadas[0]).toMatchObject({ modelo: 'claude-sonnet-5-5', maxTokens: 400, sinPensar: true })
    expect(ai.llamadas[0].herramientas).toBeUndefined()
  })
})

describe('getAi / getEmail en producción (R26)', () => {
  it('sin ANTHROPIC_API_KEY y sin AI_BACKEND=fake: error amable', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AI_BACKEND', '')
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const ai = getAi()
    await expect(ai.completar({ modelo: MODELO_MENSAJES, sistema: '', mensajes: [], maxTokens: 1 })).rejects.toThrow(
      'La IA no está configurada, avisale a Diego.',
    )
    await expect(ai.completar({ modelo: MODELO_MENSAJES, sistema: '', mensajes: [], maxTokens: 1 })).rejects.toBeInstanceOf(IaNoConfiguradaError)
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
