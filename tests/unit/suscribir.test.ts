// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'

const sesion = vi.hoisted(() => ({ rol: 'owner' as 'owner' | 'familia' | null }))
vi.mock('@/auth/session', () => ({
  SinPermiso: class extends Error { constructor(public status: number) { super('no') } },
  requerirRol: async (...roles: string[]) => {
    const { SinPermiso } = await import('@/auth/session')
    if (!sesion.rol) throw new SinPermiso(401)
    if (!roles.includes(sesion.rol)) throw new SinPermiso(403)
    return { rol: sesion.rol }
  },
}))
const repo = vi.hoisted(() => ({ r: null as unknown as MemoryRepo }))
vi.mock('@/data/getRepo', () => ({ getRepo: () => repo.r }))

import { POST } from '@/app/api/push/suscribir/route'

const bueno = { endpoint: 'https://push.example/x', keys: { p256dh: 'BP', auth: 'au' } }
const post = (b: unknown) => POST(new Request('http://x', { method: 'POST', body: JSON.stringify(b) }) as never)

describe('POST /api/push/suscribir', () => {
  beforeEach(() => { repo.r = new MemoryRepo(); sesion.rol = 'owner' })
  it('guarda y no duplica el mismo endpoint', async () => {
    expect((await post(bueno)).status).toBe(200)
    expect((await post({ ...bueno, keys: { p256dh: 'BP2', auth: 'au2' } })).status).toBe(200)
    const l = await repo.r.suscripciones.list()
    expect(l).toHaveLength(1)
    expect(l[0]).toMatchObject({ p256dh: 'BP2', auth: 'au2' })
  })
  it('familia 403, sin sesión 401', async () => {
    sesion.rol = 'familia'
    expect((await post(bueno)).status).toBe(403)
    sesion.rol = null
    expect((await post(bueno)).status).toBe(401)
  })
  it('valida la forma', async () => {
    for (const b of [null, {}, { ...bueno, endpoint: 'http://x' }, { ...bueno, endpoint: 'https://' + 'a'.repeat(3000) },
      { endpoint: bueno.endpoint }, { ...bueno, keys: { p256dh: 1, auth: 'a' } }, { ...bueno, keys: { p256dh: 'a', auth: '' } }]) {
      expect((await post(b)).status).toBe(400)
    }
    expect(await repo.r.suscripciones.list()).toHaveLength(0)
  })
})
