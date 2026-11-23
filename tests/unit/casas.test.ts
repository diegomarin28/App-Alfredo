import { describe, expect, it } from 'vitest'
import { casaDeParam, nombreCasa, validarPersonaCasa, validarEventoCasa, validarServicioCasa } from '@/domain/casas'

describe('casaDeParam', () => {
  it('acepta portofino y malibu; cualquier otra cosa es portofino', () => {
    expect(casaDeParam('malibu')).toBe('malibu')
    expect(casaDeParam('portofino')).toBe('portofino')
    expect(casaDeParam('otra')).toBe('portofino')
    expect(casaDeParam(undefined)).toBe('portofino')
    expect(casaDeParam(['malibu'])).toBe('portofino')
  })
  it('nombres', () => {
    expect(nombreCasa('malibu')).toBe('Malibú')
    expect(nombreCasa('portofino')).toBe('Portofino')
  })
})

describe('validarPersonaCasa', () => {
  it('normaliza el teléfono y recorta', () => {
    const r = validarPersonaCasa({ casa: 'malibu', nombre: ' Rosa ', rol: 'Limpieza', detalle: ' lunes ', telefono: '099 123 456' })
    expect(r).toEqual({ ok: true, valor: { casa: 'malibu', nombre: 'Rosa', rol: 'Limpieza', detalle: 'lunes', telefono: '59899123456' } })
  })
  it('teléfono opcional; inválido da Revisá el número', () => {
    const ok = validarPersonaCasa({ casa: 'portofino', nombre: 'A', rol: 'B' })
    expect(ok).toEqual({ ok: true, valor: { casa: 'portofino', nombre: 'A', rol: 'B' } })
    expect(validarPersonaCasa({ casa: 'portofino', nombre: 'A', rol: 'B', telefono: '12' })).toEqual({ ok: false, error: 'Revisá el número' })
  })
  it('exige casa, nombre y rol, con largos máximos', () => {
    expect(validarPersonaCasa({ casa: 'x', nombre: 'A', rol: 'B' }).ok).toBe(false)
    expect(validarPersonaCasa({ casa: 'malibu', nombre: ' ', rol: 'B' }).ok).toBe(false)
    expect(validarPersonaCasa({ casa: 'malibu', nombre: 'A', rol: '' }).ok).toBe(false)
    expect(validarPersonaCasa({ casa: 'malibu', nombre: 'a'.repeat(81), rol: 'B' }).ok).toBe(false)
    expect(validarPersonaCasa({ casa: 'malibu', nombre: 'A', rol: 'B', detalle: 'a'.repeat(501) }).ok).toBe(false)
  })
})

describe('validarEventoCasa', () => {
  it('cuando por defecto es hoy', () => {
    const r = validarEventoCasa({ casa: 'malibu', que: ' Se rompió el techo ', cuando: '' }, '2026-11-22')
    expect(r).toEqual({ ok: true, valor: { casa: 'malibu', que: 'Se rompió el techo', cuando: '2026-11-22' } })
  })
  it('valida fecha real y que', () => {
    expect(validarEventoCasa({ casa: 'malibu', que: 'x', cuando: '2026-02-30' }, '2026-11-22').ok).toBe(false)
    expect(validarEventoCasa({ casa: 'malibu', que: 'x', cuando: 'hoy' }, '2026-11-22').ok).toBe(false)
    expect(validarEventoCasa({ casa: 'malibu', que: ' ', cuando: '2026-11-20' }, '2026-11-22').ok).toBe(false)
    expect(validarEventoCasa({ casa: 'malibu', que: 'a'.repeat(2001), cuando: '2026-11-20' }, '2026-11-22').ok).toBe(false)
    expect(validarEventoCasa({ casa: 'zzz', que: 'x', cuando: '2026-11-20' }, '2026-11-22').ok).toBe(false)
    expect(validarEventoCasa({ casa: 'malibu', que: 'x', cuando: '2024-02-29' }, '2026-11-22').ok).toBe(true)
  })
})

describe('validarServicioCasa', () => {
  it('clave y valor obligatorios', () => {
    expect(validarServicioCasa({ casa: 'portofino', clave: ' DirecTV ', valor: ' Cliente 1 ' })).toEqual({ ok: true, valor: { casa: 'portofino', clave: 'DirecTV', valor: 'Cliente 1' } })
    expect(validarServicioCasa({ casa: 'portofino', clave: '', valor: 'x' }).ok).toBe(false)
    expect(validarServicioCasa({ casa: 'portofino', clave: 'x', valor: ' ' }).ok).toBe(false)
    expect(validarServicioCasa({ casa: 'nada', clave: 'x', valor: 'y' }).ok).toBe(false)
    expect(validarServicioCasa({ casa: 'portofino', clave: 'x'.repeat(81), valor: 'y' }).ok).toBe(false)
    expect(validarServicioCasa({ casa: 'portofino', clave: 'x', valor: 'y'.repeat(501) }).ok).toBe(false)
  })
})
