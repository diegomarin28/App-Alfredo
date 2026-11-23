import { describe, expect, it } from 'vitest'
import { normalizarTelUY, telLink, waLink } from '@/domain/telefono'

describe('normalizarTelUY', () => {
  it('casos del brief', () => {
    expect(normalizarTelUY('099 123 456')).toBe('59899123456')
    expect(normalizarTelUY('+598 99 123 456')).toBe('59899123456')
    expect(normalizarTelUY('2710 1721')).toBe('59827101721')
    expect(normalizarTelUY('abc')).toBeNull()
  })
  it('separadores y formatos', () => {
    expect(normalizarTelUY('(099) 123-456')).toBe('59899123456')
    expect(normalizarTelUY('598.99.123.456')).toBe('59899123456')
    expect(normalizarTelUY('4352 1234')).toBe('59843521234')
  })
  it('rechaza lo inválido', () => {
    expect(normalizarTelUY('')).toBeNull()
    expect(normalizarTelUY('12345')).toBeNull()
    expect(normalizarTelUY('3710 1721')).toBeNull()
    expect(normalizarTelUY('099 123 45')).toBeNull()
  })
})

describe('waLink', () => {
  it('sin teléfono', () => {
    expect(waLink('¡Feliz cumple, Martín! 🎉')).toBe('https://wa.me/?text=%C2%A1Feliz%20cumple%2C%20Mart%C3%ADn!%20%F0%9F%8E%89')
  })
  it('con teléfono', () => {
    expect(waLink('Hola', '099123456')).toBe('https://wa.me/59899123456?text=Hola')
  })
  it('teléfono inválido cae al link sin número', () => {
    expect(waLink('Hola', 'abc')).toBe('https://wa.me/?text=Hola')
  })
})

describe('telLink', () => {
  it('normaliza', () => {
    expect(telLink('099 123 456')).toBe('tel:+59899123456')
  })
  it('cae a los dígitos crudos si no puede normalizar', () => {
    expect(telLink('12-345')).toBe('tel:+12345')
  })
})
