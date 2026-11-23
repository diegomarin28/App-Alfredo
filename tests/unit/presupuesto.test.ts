// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'
import { FakeAiClient, MODELO_CONTAME, MODELO_MENSAJES, type AiArgs } from '@/ai/client'
import { FakeEmailSender } from '@/ai/email'
import { costoUsd } from '@/ai/precios'
import { SinSaldoError, usarIa } from '@/ai/presupuesto'

const CLAVES = ['AI_PRICE_INPUT_PER_MTOK', 'AI_PRICE_OUTPUT_PER_MTOK', 'AI_BUDGET_USD', 'AI_ALERT_USD', 'ALERT_EMAIL'] as const
const guardado: Record<string, string | undefined> = {}
const args: AiArgs = { modelo: MODELO_MENSAJES, sistema: 's', mensajes: [{ rol: 'user', texto: 'hola' }], maxTokens: 100 }
const argsHaiku: AiArgs = { ...args, modelo: MODELO_CONTAME }

beforeEach(() => {
  for (const k of CLAVES) guardado[k] = process.env[k]
  delete process.env.AI_PRICE_INPUT_PER_MTOK
  delete process.env.AI_PRICE_OUTPUT_PER_MTOK
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

const uso = (tokensIn: number, tokensOut: number, tokensCacheWrite = 0, tokensCacheRead = 0) =>
  ({ tokensIn, tokensOut, tokensCacheWrite, tokensCacheRead })

describe('costoUsd (precios por modelo, USD por millón de tokens)', () => {
  it('Sonnet 5.5: 1M de entrada + 1M de salida = 12 USD (2 + 10)', () => {
    expect(costoUsd(MODELO_MENSAJES, uso(1e6, 1e6))).toBeCloseTo(12, 10)
  })
  it('Haiku 5.5 a precio base: 1M de entrada + 1M de salida en diez pedidos de 100K = 0.60 USD (0.10 + 0.50)', () => {
    const uno = costoUsd(MODELO_CONTAME, uso(100_000, 100_000))
    expect(uno).toBeCloseTo(0.06, 12)
    expect(10 * uno).toBeCloseTo(0.6, 10)
  })
  it('Sonnet 5.5: escribir 1M en caché = 2.50, leer 1M de caché = 0.10', () => {
    expect(costoUsd(MODELO_MENSAJES, uso(0, 0, 1e6, 0))).toBeCloseTo(2.5, 10)
    expect(costoUsd(MODELO_MENSAJES, uso(0, 0, 0, 1e6))).toBeCloseTo(0.1, 10)
  })
  it('Haiku 5.5: escribir en caché = 0.125, leer = 0.01 (por millón)', () => {
    expect(costoUsd(MODELO_CONTAME, uso(0, 0, 100_000, 0))).toBeCloseTo(0.0125, 12)
    expect(costoUsd(MODELO_CONTAME, uso(0, 0, 0, 100_000))).toBeCloseTo(0.001, 12)
  })
  it('suma entrada sin caché + escritura + lectura + salida', () => {
    // 1000×2 + 2000×2.5 + 3000×0.1 + 500×10 = 12300 / 1e6
    expect(costoUsd(MODELO_MENSAJES, uso(1000, 500, 2000, 3000))).toBeCloseTo(0.0123, 12)
  })
  it('Haiku 5.5 con un prompt de más de 100K tokens (sumando caché) cobra 0.50 / 2.50 y la caché sobre esa entrada', () => {
    // prompt = 10_000 + 40_000 + 50_000 = 100_000: precio base
    expect(costoUsd(MODELO_CONTAME, uso(10_000, 1000, 40_000, 50_000)))
      .toBeCloseTo((10_000 * 0.1 + 40_000 * 0.125 + 50_000 * 0.01 + 1000 * 0.5) / 1e6, 12)
    // un token más: precio de prompt largo (caché ×1.25 / ×0.1 sobre 0.50)
    expect(costoUsd(MODELO_CONTAME, uso(10_001, 1000, 40_000, 50_000)))
      .toBeCloseTo((10_001 * 0.5 + 40_000 * 0.625 + 50_000 * 0.05 + 1000 * 2.5) / 1e6, 12)
    // un solo pedido de 1M de entrada + 1M de salida: 0.50 + 2.50
    expect(costoUsd(MODELO_CONTAME, uso(1e6, 1e6))).toBeCloseTo(3, 10)
  })
  it('Sonnet 5.5 no tiene precio de prompt largo', () => {
    expect(costoUsd(MODELO_MENSAJES, uso(500_000, 0))).toBeCloseTo(1, 10)
  })
})

describe('usarIa', () => {
  it('registra el costo con el precio del modelo; tokensIn guardado = sin caché + escritura + lectura', async () => {
    const repo = new MemoryRepo()
    const ai = new FakeAiClient([{ texto: 'ok', tokensIn: 1000, tokensOut: 500, tokensCacheWrite: 2000, tokensCacheRead: 3000 }])
    const r = await usarIa(repo, ai, new FakeEmailSender(), args)
    expect(r.texto).toBe('ok')
    const usos = await repo.usoIa.list()
    expect(usos).toHaveLength(1)
    expect(usos[0].costoUsd).toBeCloseTo(0.0123, 12)
    expect(usos[0]).toMatchObject({ tokensIn: 6000, tokensOut: 500 })
  })

  it('no lee AI_PRICE_*: con valores basura usa igual la tabla de precios', async () => {
    process.env.AI_PRICE_INPUT_PER_MTOK = 'abc'
    process.env.AI_PRICE_OUTPUT_PER_MTOK = '-1'
    const repo = new MemoryRepo()
    await usarIa(repo, new FakeAiClient([{ tokensIn: 1e6, tokensOut: 0 }]), new FakeEmailSender(), args)
    expect((await repo.usoIa.list())[0].costoUsd).toBeCloseTo(2, 10)
  })

  it('el gasto total suma Sonnet y Haiku, cada uno con su precio: el aviso sale al cruzar 16 entre los dos', async () => {
    const repo = new MemoryRepo()
    await gasto(repo, 15)
    const email = new FakeEmailSender()
    const ai = new FakeAiClient([
      { tokensIn: 400_000, tokensOut: 10_000 }, // Sonnet: 0.80 + 0.10 = 0.90 → 15.90
      { tokensIn: 100_000, tokensOut: 200_000 }, // Haiku: 0.01 + 0.10 = 0.11 → 16.01
    ])
    await usarIa(repo, ai, email, args)
    expect(email.enviados).toHaveLength(0)
    await usarIa(repo, ai, email, argsHaiku)
    expect(email.enviados).toHaveLength(1)
    expect(email.enviados[0].texto).toContain('16.01')
    const costos = (await repo.usoIa.list()).map((u) => u.costoUsd)
    expect(costos[1]).toBeCloseTo(0.9, 10)
    expect(costos[2]).toBeCloseTo(0.11, 10)
  })

  it('el saldo se agota con la suma de los dos modelos', async () => {
    const repo = new MemoryRepo()
    await gasto(repo, 19)
    const ai = new FakeAiClient([
      { tokensIn: 400_000, tokensOut: 10_000 }, // Sonnet 0.90 → 19.90
      { tokensIn: 100_000, tokensOut: 200_000 }, // Haiku 0.11 → 20.01
      {},
    ])
    await usarIa(repo, ai, new FakeEmailSender(), args)
    await usarIa(repo, ai, new FakeEmailSender(), argsHaiku)
    await expect(usarIa(repo, ai, new FakeEmailSender(), args)).rejects.toBeInstanceOf(SinSaldoError)
    expect(ai.llamadas).toHaveLength(2)
  })

  it('al cruzar 16 manda un solo mail aunque haya dos llamadas más', async () => {
    const repo = new MemoryRepo()
    await gasto(repo, 15.995)
    const email = new FakeEmailSender()
    const ai = new FakeAiClient([
      { tokensIn: 1000, tokensOut: 500 },
      { tokensIn: 1000, tokensOut: 500 },
      { tokensIn: 1000, tokensOut: 500 },
    ])
    await usarIa(repo, ai, email, args) // 15.995 + 0.007 = 16.002 -> cruza
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
