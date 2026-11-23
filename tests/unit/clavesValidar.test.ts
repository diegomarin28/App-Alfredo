import { describe, expect, it } from 'vitest'
import { validarClave, validarConfigClaves } from '@/claves/validar'

const b64 = (n: number) => btoa(String.fromCharCode(...new Uint8Array(n).fill(7)))
const iv = b64(12)
const cifrado = b64(40)

describe('validarClave (POST /api/claves)', () => {
  it('acepta lo válido y devuelve solo los campos permitidos', () => {
    expect(validarClave({ sitio: ' Banco ', usuario: ' alfredo ', cifrado, iv, texto: 'plano', extra: 1 }))
      .toEqual({ ok: true, valor: { sitio: 'Banco', usuario: 'alfredo', cifrado, iv } })
  })

  it('usuario es opcional; vacío queda ausente', () => {
    expect(validarClave({ sitio: 'Banco', cifrado, iv })).toEqual({ ok: true, valor: { sitio: 'Banco', cifrado, iv } })
    expect(validarClave({ sitio: 'Banco', usuario: '  ', cifrado, iv })).toEqual({ ok: true, valor: { sitio: 'Banco', cifrado, iv } })
  })

  it('sitio 1 a 80, usuario hasta 120', () => {
    expect(validarClave({ sitio: '', cifrado, iv }).ok).toBe(false)
    expect(validarClave({ sitio: '   ', cifrado, iv }).ok).toBe(false)
    expect(validarClave({ sitio: 'x'.repeat(80), cifrado, iv }).ok).toBe(true)
    expect(validarClave({ sitio: 'x'.repeat(81), cifrado, iv }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', usuario: 'u'.repeat(120), cifrado, iv }).ok).toBe(true)
    expect(validarClave({ sitio: 'B', usuario: 'u'.repeat(121), cifrado, iv }).ok).toBe(false)
    expect(validarClave({ sitio: 3, cifrado, iv }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', usuario: 3, cifrado, iv }).ok).toBe(false)
  })

  it('cifrado: base64 válido de hasta 8 KB', () => {
    expect(validarClave({ sitio: 'B', cifrado: 'mi clave', iv }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', cifrado: '', iv }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', cifrado: 'abc', iv }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', cifrado: 'A'.repeat(8192), iv }).ok).toBe(true)
    expect(validarClave({ sitio: 'B', cifrado: 'A'.repeat(8196), iv }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', iv }).ok).toBe(false)
  })

  it('iv: base64 de exactamente 12 bytes', () => {
    expect(validarClave({ sitio: 'B', cifrado, iv: b64(11) }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', cifrado, iv: b64(16) }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', cifrado, iv: '!!!!!!!!!!!!!!!!' }).ok).toBe(false)
    expect(validarClave({ sitio: 'B', cifrado }).ok).toBe(false)
  })

  it('cuerpo que no es objeto', () => {
    expect(validarClave(null).ok).toBe(false)
    expect(validarClave('x').ok).toBe(false)
  })
})

describe('validarConfigClaves (POST /api/claves/config)', () => {
  const buena = { claveSalt: b64(32), claveModo: 'pin', claveCheck: b64(18), claveCheckIv: iv }

  it('acepta lo válido y devuelve solo esos campos', () => {
    expect(validarConfigClaves({ ...buena, nombre: 'x' })).toEqual({ ok: true, valor: buena })
    expect(validarConfigClaves({ ...buena, claveModo: 'prf' }).ok).toBe(true)
  })

  it('rechaza modo, sal, check o iv inválidos', () => {
    expect(validarConfigClaves({ ...buena, claveModo: 'otro' }).ok).toBe(false)
    expect(validarConfigClaves({ ...buena, claveSalt: b64(16) }).ok).toBe(false)
    expect(validarConfigClaves({ ...buena, claveCheck: 'ok' }).ok).toBe(false)
    expect(validarConfigClaves({ ...buena, claveCheck: 'A'.repeat(2048) }).ok).toBe(false)
    expect(validarConfigClaves({ ...buena, claveCheckIv: b64(13) }).ok).toBe(false)
    expect(validarConfigClaves({ claveModo: 'pin' }).ok).toBe(false)
    expect(validarConfigClaves(null).ok).toBe(false)
  })
})
