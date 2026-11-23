// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { COOKIE_SESION, FAMILIA_GRACIA_SEGUNDOS, nuevaSesion, rolDeCookie, sellar } from '@/auth/sesionSellada'
import { destinoSinSesion } from '@/auth/access'

const AHORA = new Date('2026-11-22T12:00:00-03:00')

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'x'.repeat(40))
  vi.stubEnv('FAMILY_EXPIRES_AT', '2026-11-25T23:59:00-03:00')
})
afterEach(() => vi.unstubAllEnvs())

const pedir = (path: string, cookie?: string) =>
  middleware(new NextRequest(`http://localhost:3100${path}`, { headers: cookie ? { cookie: `${COOKIE_SESION}=${cookie}` } : {} }))

describe('destinoSinSesion', () => {
  it('familia (cookie vencida o inválida) va a /familia; el resto a /entrar', () => {
    expect(destinoSinSesion('familia')).toBe('/familia')
    expect(destinoSinSesion('owner')).toBe('/entrar')
    expect(destinoSinSesion(null)).toBe('/entrar')
  })
})

describe('rolDeCookie', () => {
  it('lee el rol de un sello válido aunque la sesión ya no valga; basura → null', async () => {
    expect(await rolDeCookie(await sellar({ rol: 'familia', expira: '2020-01-01T00:00:00Z' }, 3600))).toBe('familia')
    expect(await rolDeCookie(await sellar({ rol: 'owner' }, 3600))).toBe('owner')
    expect(await rolDeCookie(await sellar({ rol: 'admin' }, 3600))).toBeNull()
    expect(await rolDeCookie('basura')).toBeNull()
    expect(await rolDeCookie(undefined)).toBeNull()
  })
})

describe('nuevaSesion de familia', () => {
  it('vale hasta FAMILY_EXPIRES_AT, pero la cookie dura un poco más para poder decir "Este link ya no sirve"', () => {
    const n = nuevaSesion('familia', AHORA)!
    expect(n.datos).toEqual({ rol: 'familia', expira: new Date('2026-11-25T23:59:00-03:00').toISOString() })
    const hastaVencer = (new Date('2026-11-25T23:59:00-03:00').getTime() - AHORA.getTime()) / 1000
    expect(n.segundos).toBe(Math.floor(hastaVencer) + FAMILIA_GRACIA_SEGUNDOS)
  })
})

describe('middleware: sesión de familia vencida', () => {
  it('página → /familia y borra la cookie', async () => {
    const vencida = await sellar({ rol: 'familia', expira: '2026-11-20T00:00:00-03:00' }, 3600)
    const r = await pedir('/calendario', vencida)
    expect(r.status).toBe(307)
    expect(new URL(r.headers.get('location')!).pathname).toBe('/familia')
    expect(r.headers.get('set-cookie')).toMatch(new RegExp(`${COOKIE_SESION}=;.*Max-Age=0`, 'i'))
  })

  it('también si venció por FAMILY_EXPIRES_AT', async () => {
    vi.stubEnv('FAMILY_EXPIRES_AT', '2020-01-01T00:00:00Z')
    const r = await pedir('/', await sellar({ rol: 'familia', expira: '2099-01-01T00:00:00Z' }, 3600))
    expect(new URL(r.headers.get('location')!).pathname).toBe('/familia')
  })

  it('API → 401 JSON como siempre', async () => {
    const r = await pedir('/api/fechas', await sellar({ rol: 'familia', expira: '2020-01-01T00:00:00Z' }, 3600))
    expect(r.status).toBe(401)
  })

  it('sin cookie, cookie inválida u owner con sello roto → /entrar', async () => {
    for (const c of [undefined, 'basura']) {
      const r = await pedir('/calendario', c)
      expect(new URL(r.headers.get('location')!).pathname).toBe('/entrar')
    }
  })
})
