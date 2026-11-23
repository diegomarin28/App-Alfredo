import { describe, expect, it } from 'vitest'
import { validarId } from '@/domain/ids'

describe('validarId', () => {
  it('acepta un texto no vacío de hasta 100 caracteres', () => {
    expect(validarId('2f1c7a7e-2b1d-4d43-9d0c-0d9b3b0e8f11')).toBe(true)
    expect(validarId('x'.repeat(100))).toBe(true)
  })
  it('rechaza vacíos, muy largos y lo que no es texto', () => {
    for (const malo of ['', '   ', 'x'.repeat(101), undefined, null, 3, {}, ['a']]) expect(validarId(malo)).toBe(false)
  })
})
