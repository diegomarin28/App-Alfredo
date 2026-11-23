// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { opcionesEntrada, opcionesRegistro, verificarEntrada } from '@/auth/passkeys'
import { MemoryRepo } from '@/data/memoryRepo'

afterEach(() => vi.unstubAllEnvs())

describe('passkeys', () => {
  it('registro: passkey descubrible, Face ID obligatorio, PRF pedido y sin repetir las ya guardadas', async () => {
    vi.stubEnv('NEXT_PUBLIC_RP_ID', 'alfredo.example')
    const repo = new MemoryRepo()
    await repo.passkeys.create({ credentialId: 'cred-1', publicKey: 'pk', counter: 0, transports: ['internal'] })
    const o = await opcionesRegistro(repo)
    expect(o.rp).toEqual({ name: 'Alfredo', id: 'alfredo.example' })
    expect(o.authenticatorSelection).toMatchObject({ residentKey: 'required', userVerification: 'required' })
    expect(o.extensions).toMatchObject({ prf: {} })
    expect(o.excludeCredentials).toEqual([expect.objectContaining({ id: 'cred-1' })])
    expect(o.challenge).toBeTruthy()
  })

  it('entrada: sin lista de credenciales (entra sin usuario) y con Face ID obligatorio', async () => {
    const o = await opcionesEntrada()
    expect(o.rpId).toBe('localhost')
    expect(o.userVerification).toBe('required')
    expect(o.allowCredentials ?? []).toEqual([])
  })

  it('entrada con una credencial desconocida no verifica', async () => {
    const repo = new MemoryRepo()
    const falsa = { id: 'nadie', rawId: 'nadie', type: 'public-key', response: {}, clientExtensionResults: {} }
    expect(await verificarEntrada(repo, falsa as never, 'desafio')).toBe(false)
  })
})
