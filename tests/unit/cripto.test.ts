// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { aBase64, cifrar, deBase64, derivarClavePin, derivarClavePrf, descifrar } from '@/claves/cripto'

const salt = () => crypto.getRandomValues(new Uint8Array(32))
const prf = () => crypto.getRandomValues(new Uint8Array(32)).buffer

describe('cripto de Contraseñas (WebCrypto)', () => {
  it('usa el WebCrypto de Node', () => {
    expect(globalThis.crypto.subtle).toBeDefined()
  })

  it('cifrar → descifrar devuelve el texto (PIN)', async () => {
    const key = await derivarClavePin('482915', salt())
    const c = await cifrar(key, 'Mi clave del Banco ñ 123')
    expect(await descifrar(key, c)).toBe('Mi clave del Banco ñ 123')
  })

  it('cifrar → descifrar devuelve el texto (PRF)', async () => {
    const key = await derivarClavePrf(prf(), salt())
    expect(await descifrar(key, await cifrar(key, 'secreto'))).toBe('secreto')
  })

  it('base64 con IV de 12 bytes al azar; el mismo texto da iv y cifrado distintos', async () => {
    const key = await derivarClavePrf(prf(), salt())
    const a = await cifrar(key, 'igual')
    const b = await cifrar(key, 'igual')
    expect(deBase64(a.iv)).toHaveLength(12)
    expect(a.cifrado).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(a.iv).not.toBe(b.iv)
    expect(a.cifrado).not.toBe(b.cifrado)
    expect(a.cifrado).not.toContain('igual')
  })

  it('con la clave de otro PIN no descifra (lanza)', async () => {
    const s = salt()
    const buena = await derivarClavePin('482915', s)
    const mala = await derivarClavePin('111111', s)
    const c = await cifrar(buena, 'ok')
    await expect(descifrar(mala, c)).rejects.toThrow()
  })

  it('el mismo PIN con otra sal no descifra', async () => {
    const c = await cifrar(await derivarClavePin('482915', salt()), 'ok')
    await expect(descifrar(await derivarClavePin('482915', salt()), c)).rejects.toThrow()
  })

  it('la clave PRF es estable: misma salida PRF y sal → descifra', async () => {
    const p = prf()
    const s = salt()
    const c = await cifrar(await derivarClavePrf(p, s), 'ok')
    const otraVez = await derivarClavePrf(p.slice(0), new Uint8Array(s))
    expect(await descifrar(otraVez, c)).toBe('ok')
    await expect(descifrar(await derivarClavePrf(prf(), s), c)).rejects.toThrow()
  })

  it('las claves no se pueden exportar', async () => {
    const key = await derivarClavePin('482915', salt())
    expect(key.extractable).toBe(false)
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 })
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow()
  })

  it('base64 ida y vuelta', () => {
    const b = new Uint8Array([0, 1, 2, 250, 255, 128])
    expect(Array.from(deBase64(aBase64(b)))).toEqual(Array.from(b))
  })
})
