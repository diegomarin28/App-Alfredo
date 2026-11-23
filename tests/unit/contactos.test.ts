import { describe, expect, it } from 'vitest'
import { formatearTelUY, normalizarBusqueda, coincide, validarContacto } from '@/domain/contactos'

describe('normalizarBusqueda', () => {
  it('ignora mayúsculas, tildes y espacios de los bordes', () => {
    expect(normalizarBusqueda('  MARTÍN ')).toBe('martin')
    expect(normalizarBusqueda('Peña')).toBe('pena')
  })
})

describe('coincide', () => {
  const c = { nombre: 'Martín Pérez', empresa: 'Ferretería Ñandú' }
  it('busca en nombre y empresa', () => {
    expect(coincide(c, 'martin')).toBe(true)
    expect(coincide(c, 'FERRETERIA')).toBe(true)
    expect(coincide(c, 'nandu')).toBe(true)
    expect(coincide(c, 'otro')).toBe(false)
    expect(coincide({ nombre: 'Ana' }, 'ana')).toBe(true)
    expect(coincide(c, '')).toBe(true)
  })
})

describe('formatearTelUY', () => {
  it('móvil', () => expect(formatearTelUY('59899123456')).toBe('099 123 456'))
  it('fijo', () => expect(formatearTelUY('59829001234')).toBe('2900 1234'))
  it('otro número queda igual', () => expect(formatearTelUY('5491155551234')).toBe('5491155551234'))
})

describe('validarContacto', () => {
  const base = { nombre: ' Ana ', tipo: 'cliente', empresa: '', telefono: '', nota: '' }
  it('acepta lo mínimo y limpia', () => {
    expect(validarContacto(base)).toEqual({ ok: true, valor: { nombre: 'Ana', tipo: 'cliente' } })
  })
  it('normaliza el teléfono', () => {
    const r = validarContacto({ ...base, telefono: '099 123 456', empresa: 'ACME', nota: 'x' })
    expect(r).toEqual({ ok: true, valor: { nombre: 'Ana', tipo: 'cliente', telefono: '59899123456', empresa: 'ACME', nota: 'x' } })
  })
  it('rechaza teléfono inválido', () => {
    expect(validarContacto({ ...base, telefono: '123' })).toEqual({ ok: false, error: 'Revisá el número' })
  })
  it('exige nombre y tipo válido', () => {
    expect(validarContacto({ ...base, nombre: '  ' }).ok).toBe(false)
    expect(validarContacto({ ...base, tipo: 'x' }).ok).toBe(false)
  })
  it('límites de largo', () => {
    expect(validarContacto({ ...base, nombre: 'a'.repeat(81) }).ok).toBe(false)
    expect(validarContacto({ ...base, empresa: 'a'.repeat(81) }).ok).toBe(false)
    expect(validarContacto({ ...base, nota: 'a'.repeat(2001) }).ok).toBe(false)
  })
})
