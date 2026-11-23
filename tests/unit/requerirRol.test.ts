import { beforeEach, describe, expect, it, vi } from 'vitest'

let sesion: { rol: 'owner' | 'familia' } | null = null
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@/auth/sesionSellada', async (orig) => ({
  ...(await orig<typeof import('@/auth/sesionSellada')>()),
  leerSesion: async () => sesion,
}))

import { requerirRol } from '@/auth/session'

describe('requerirRol', () => {
  beforeEach(() => { sesion = null })
  it('sin sesión lanza', async () => { await expect(requerirRol('owner')).rejects.toThrow() })
  it('rol no permitido lanza', async () => {
    sesion = { rol: 'familia' }
    await expect(requerirRol('owner')).rejects.toThrow()
  })
  it('rol permitido devuelve la sesión', async () => {
    sesion = { rol: 'familia' }
    await expect(requerirRol('owner', 'familia')).resolves.toEqual({ rol: 'familia' })
  })
})
