// @vitest-environment node
import { describe, expect, it } from 'vitest'

describe('duración máxima de las rutas de IA (Vercel)', () => {
  it('mensajes: 60 s; contame: 300 s', async () => {
    expect((await import('@/app/api/ai/mensajes/route')).maxDuration).toBe(60)
    expect((await import('@/app/api/ai/contame/route')).maxDuration).toBe(300)
  })
})
