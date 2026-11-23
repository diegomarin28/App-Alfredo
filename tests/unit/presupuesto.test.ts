// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'
import { FakeAiClient } from '@/ai/client'
import { FakeEmailSender } from '@/ai/email'
import { SinSaldoError, usarIa } from '@/ai/presupuesto'

const CLAVES = ['AI_PRICE_INPUT_PER_MTOK', 'AI_PRICE_OUTPUT_PER_MTOK', 'AI_BUDGET_USD', 'AI_ALERT_USD', 'ALERT_EMAIL'] as const
const guardado: Record<string, string | undefined> = {}
const args = { sistema: 's', mensajes: [{ rol: 'user' as const, texto: 'hola' }], maxTokens: 100 }

beforeEach(() => {
  for (const k of CLAVES) guardado[k] = process.env[k]
  process.env.AI_PRICE_INPUT_PER_MTOK = '3'
  process.env.AI_PRICE_OUTPUT_PER_MTOK = '15'
  process.env.AI_BUDGET_USD = '20'
  process.env.AI_ALERT_USD = '16'
  process.env.ALERT_EMAIL = 'diego@example.com'
})
afterEach(() => {
  for (const k of CLAVES) {
    if (guardado[k] === undefined) delete process.env[k]
    else process.env[k] = guardado[k]
  }
  vi.restoreAllMocks()
})

const gasto = (repo: MemoryRepo, costoUsd: number) =>
  repo.usoIa.create({ tokensIn: 0, tokensOut: 0, costoUsd })

describe('usarIa', () => {
  it('registra el costo: 1000 in / 500 out = 0.0105', async () => {
    const repo = new MemoryRepo()
    const ai = new FakeAiClient([{ texto: 'ok', tokensIn: 1000, tokensOut: 500 }])
    const r = await usarIa(repo, ai, new FakeEmailSender(), args)
    expect(r.texto).toBe('ok')
    const usos = await repo.usoIa.list()
    expect(usos).toHaveLength(1)
    expect(usos[0].costoUsd).toBeCloseTo(0.0105, 10)
    expect(usos[0]).toMatchObject({ tokensIn: 1000, tokensOut: 500 })
  })

  it('al cruzar 16 manda un solo mail aunque haya dos llamadas más', async () => {
    const repo = new MemoryRepo()
    await gasto(repo, 15.99)
    const email = new FakeEmailSender()
    const ai = new FakeAiClient([
      { tokensIn: 1000, tokensOut: 500 },
      { tokensIn: 1000, tokensOut: 500 },
      { tokensIn: 1000, tokensOut: 500 },
    ])
    await usarIa(repo, ai, email, args) // 16.0005 -> cruza
    await usarIa(repo, ai, email, args)
    await usarIa(repo, ai, email, args)
    expect(email.enviados).toHaveLength(1)
    expect(email.enviados[0].to).toBe('diego@example.com')
    expect(email.enviados[0].asunto).toBe('App Alfredo: queda poco saldo de IA')
    expect(email.enviados[0].texto).toContain('16.')
    expect((await repo.getConfig()).alertaIaEnviada).toBe(true)
  })

  it('con 20 gastados no llama al cliente y tira SinSaldoError', async () => {
    const repo = new MemoryRepo()
    await gasto(repo, 20)
    const ai = new FakeAiClient([{ texto: 'x' }])
    const p = usarIa(repo, ai, new FakeEmailSender(), args)
    await expect(p).rejects.toBeInstanceOf(SinSaldoError)
    await expect(p).rejects.toThrow('Se terminó el saldo de la IA, avisale a Diego.')
    expect(ai.llamadas).toHaveLength(0)
  })

  it('si falla el mail, la llamada sigue bien, la marca queda en false y reintenta', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repo = new MemoryRepo()
    await gasto(repo, 16)
    const email = new FakeEmailSender()
    email.fallar = true
    const ai = new FakeAiClient([{ texto: 'a' }, { texto: 'b' }])
    const r = await usarIa(repo, ai, email, args)
    expect(r.texto).toBe('a')
    expect(err).toHaveBeenCalled()
    expect((await repo.getConfig()).alertaIaEnviada).toBe(false)
    email.fallar = false
    await usarIa(repo, ai, email, args)
    expect(email.enviados).toHaveLength(1)
    expect((await repo.getConfig()).alertaIaEnviada).toBe(true)
  })

  it('sin ALERT_EMAIL no manda mail ni marca la alerta', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.ALERT_EMAIL
    const repo = new MemoryRepo()
    await gasto(repo, 17)
    const email = new FakeEmailSender()
    await usarIa(repo, new FakeAiClient([{}]), email, args)
    expect(email.enviados).toHaveLength(0)
    expect((await repo.getConfig()).alertaIaEnviada).toBe(false)
  })

  it.each([
    ['AI_PRICE_INPUT_PER_MTOK', undefined],
    ['AI_PRICE_OUTPUT_PER_MTOK', ''],
    ['AI_PRICE_INPUT_PER_MTOK', 'abc'],
    ['AI_PRICE_OUTPUT_PER_MTOK', '-1'],
    ['AI_PRICE_OUTPUT_PER_MTOK', 'Infinity'],
  ])('precio inválido (%s=%s) falla antes de llamar', async (k, v) => {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
    const repo = new MemoryRepo()
    const ai = new FakeAiClient([{}])
    await expect(usarIa(repo, ai, new FakeEmailSender(), args)).rejects.toThrow(/AI_PRICE/)
    expect(ai.llamadas).toHaveLength(0)
    expect(await repo.usoIa.list()).toHaveLength(0)
  })
})

describe('FakeAiClient', () => {
  it('usa la cola, registra llamadas y cuando se vacía devuelve un eco determinista', async () => {
    const ai = new FakeAiClient([{ texto: 'uno', toolName: 't', toolInput: { a: 1 } }])
    const a = await ai.completar(args)
    expect(a).toMatchObject({ texto: 'uno', toolName: 't', toolInput: { a: 1 }, tokensIn: 100, tokensOut: 50 })
    const b = await ai.completar(args)
    expect(b.texto).toContain('hola')
    expect(ai.llamadas).toHaveLength(2)
  })
})
