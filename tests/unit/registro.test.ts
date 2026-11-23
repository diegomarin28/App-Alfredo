// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { MemoryRepo } from '@/data/memoryRepo'

let sesion: { rol: 'owner' | 'familia' } | null = null
let repo = new MemoryRepo()
let desafio: string | null = null
const iniciadas: string[] = []
vi.mock('@/data/getRepo', () => ({ getRepo: () => repo }))
vi.mock('@/auth/session', () => ({
  getSesion: async () => sesion,
  guardarDesafio: async (d: string) => { desafio = d },
  tomarDesafio: async () => desafio,
  iniciarSesion: async (rol: string) => { iniciadas.push(rol); return true },
  cerrarSesion: async () => {},
}))
const verificarRegistro = vi.fn(async () => true)
vi.mock('@/auth/passkeys', async (orig) => ({
  ...(await orig<typeof import('@/auth/passkeys')>()),
  verificarRegistro: (...a: unknown[]) => verificarRegistro(...(a as [])),
}))

const { POST } = await import('@/app/api/auth/[...accion]/route')

const CODIGO = 'codigo-largo-de-configuracion-1'
const pedir = (accion: string, cuerpo: object) =>
  POST(new NextRequest(`http://localhost:3100/api/auth/${accion}`, { method: 'POST', body: JSON.stringify(cuerpo) }),
    { params: Promise.resolve({ accion: accion.split('/') }) })

beforeEach(() => {
  vi.stubEnv('SETUP_CODE', CODIGO)
  repo = new MemoryRepo()
  sesion = null
  desafio = null
  iniciadas.length = 0
  verificarRegistro.mockClear()
})
afterEach(() => vi.unstubAllEnvs())

const conPasskey = () => repo.passkeys.create({ credentialId: 'cred-1', publicKey: 'pk', counter: 0, transports: ['internal'] })

describe('registro de passkeys', () => {
  it('la primera vez: con el código da opciones y verificar abre sesión de owner', async () => {
    expect((await pedir('registro/opciones', { codigo: CODIGO })).status).toBe(200)
    expect((await pedir('registro/verificar', {})).status).toBe(200)
    expect(iniciadas).toEqual(['owner'])
  })

  it('con una passkey ya guardada y sin sesión de owner: 403 en castellano, aunque el código sea correcto', async () => {
    await conPasskey()
    const r = await pedir('registro/opciones', { codigo: CODIGO })
    expect(r.status).toBe(403)
    expect((await r.json()).error).toMatch(/Face ID ya está configurado/)
    sesion = { rol: 'familia' }
    expect((await pedir('registro/opciones', { codigo: CODIGO })).status).toBe(403)
  })

  it('verificar también se niega si mientras tanto ya se registró una passkey', async () => {
    expect((await pedir('registro/opciones', { codigo: CODIGO })).status).toBe(200)
    await conPasskey()
    const r = await pedir('registro/verificar', {})
    expect(r.status).toBe(403)
    expect(verificarRegistro).not.toHaveBeenCalled()
    expect(iniciadas).toEqual([])
  })

  it('una sesión de owner puede sumar otra passkey (teléfono nuevo)', async () => {
    await conPasskey()
    sesion = { rol: 'owner' }
    expect((await pedir('registro/opciones', { codigo: CODIGO })).status).toBe(200)
    expect((await pedir('registro/verificar', {})).status).toBe(200)
  })

  it('SETUP_CODE de menos de 20 caracteres: nunca se acepta', async () => {
    vi.stubEnv('SETUP_CODE', 'corto-123')
    expect((await pedir('registro/opciones', { codigo: 'corto-123' })).status).toBe(403)
  })
})
