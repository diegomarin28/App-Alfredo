import { describe, expect, it } from 'vitest'
import { chipVencimiento, fechaCompleta, fechaCorta, validarNota, validarPendiente, validarVencimiento } from '@/domain/vencimientos'

describe('fechaCompleta / fechaCorta', () => {
  it('formatea', () => {
    expect(fechaCompleta('2026-12-12')).toBe('12 de diciembre de 2026')
    expect(fechaCompleta('2026-01-05')).toBe('5 de enero de 2026')
    expect(fechaCorta('2026-11-22T15:00:00.000Z')).toBe('22 de noviembre')
  })
  it('usa la fecha de Montevideo', () => {
    expect(fechaCorta('2026-11-23T01:30:00.000Z')).toBe('22 de noviembre')
  })
})

describe('chipVencimiento', () => {
  it('textos', () => {
    expect(chipVencimiento(0)).toBe('Hoy')
    expect(chipVencimiento(1)).toBe('Mañana')
    expect(chipVencimiento(5)).toBe('En 5 días')
    expect(chipVencimiento(-1)).toBe('Venció hace 1 día')
    expect(chipVencimiento(-3)).toBe('Venció hace 3 días')
  })
})

const ok = { titulo: ' Seguro ', ambito: 'empresa', fecha: '2026-12-12', avisarDiasAntes: 30 }
describe('validarVencimiento', () => {
  it('acepta y recorta', () => {
    expect(validarVencimiento(ok)).toEqual({ ok: true, valor: { titulo: 'Seguro', ambito: 'empresa', fecha: '2026-12-12', avisarDiasAntes: 30, hecho: false } })
  })
  it('rechaza', () => {
    expect(validarVencimiento({ ...ok, titulo: '  ' }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, titulo: 'x'.repeat(81) }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, ambito: 'otro' }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, fecha: '' }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, fecha: '2026-02-30' }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, fecha: '12/12/2026' }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, avisarDiasAntes: 0 }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, avisarDiasAntes: 366 }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, avisarDiasAntes: 1.5 }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, avisarDiasAntes: NaN }).ok).toBe(false)
    expect(validarVencimiento({ ...ok, titulo: 5 as unknown as string }).ok).toBe(false)
  })
})

describe('validarPendiente / validarNota', () => {
  it('recortan y limitan', () => {
    expect(validarPendiente('  Llamar  ')).toEqual({ ok: true, valor: 'Llamar' })
    expect(validarPendiente('').ok).toBe(false)
    expect(validarPendiente('x'.repeat(201)).ok).toBe(false)
    expect(validarPendiente(null as unknown as string).ok).toBe(false)
    expect(validarNota(' hola ')).toEqual({ ok: true, valor: 'hola' })
    expect(validarNota('   ').ok).toBe(false)
    expect(validarNota('x'.repeat(5001)).ok).toBe(false)
  })
})
