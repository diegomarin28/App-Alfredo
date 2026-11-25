import { describe, expect, it } from 'vitest'
import { proximaRepeticion, rotuloRepeticion, proximaDeFecha, posponerPor, resolverRecordatorio } from '@/domain/repeticion'
import { recordatoriosActivos } from '@/domain/fechas'
import type { Recordatorio } from '@/domain/tipos'

describe('proximaRepeticion (la próxima vez, desde hoy inclusive)', () => {
  it('no se repite: la fecha si todavía no pasó; si pasó, ninguna', () => {
    expect(proximaRepeticion('2026-12-10', 'nunca', '2026-11-24')).toBe('2026-12-10')
    expect(proximaRepeticion('2026-11-24', 'nunca', '2026-11-24')).toBe('2026-11-24')
    expect(proximaRepeticion('2026-11-20', 'nunca', '2026-11-24')).toBeNull()
  })
  it('todos los días: hoy (o la fecha, si es más adelante)', () => {
    expect(proximaRepeticion('2026-01-05', 'diaria', '2026-11-24')).toBe('2026-11-24')
    expect(proximaRepeticion('2026-12-01', 'diaria', '2026-11-24')).toBe('2026-12-01')
  })
  it('todas las semanas: el mismo día de la semana que la fecha', () => {
    // 2026-11-02 es lunes; hoy martes 24 → lunes 30
    expect(proximaRepeticion('2026-11-02', 'semanal', '2026-11-24')).toBe('2026-11-30')
    expect(proximaRepeticion('2026-11-03', 'semanal', '2026-11-24')).toBe('2026-11-24')
    expect(proximaRepeticion('2026-12-15', 'semanal', '2026-11-24')).toBe('2026-12-15')
  })
  it('todos los meses: el mismo día; si el mes no lo tiene, el último', () => {
    expect(proximaRepeticion('2026-01-10', 'mensual', '2026-11-24')).toBe('2026-12-10')
    expect(proximaRepeticion('2026-01-24', 'mensual', '2026-11-24')).toBe('2026-11-24')
    expect(proximaRepeticion('2026-01-31', 'mensual', '2026-11-24')).toBe('2026-11-30')
    expect(proximaRepeticion('2026-01-31', 'mensual', '2027-02-02')).toBe('2027-02-28')
    expect(proximaRepeticion('2026-01-31', 'mensual', '2028-02-02')).toBe('2028-02-29')
    expect(proximaRepeticion('2026-01-30', 'mensual', '2026-12-31')).toBe('2027-01-30')
  })
  it('todos los años: el mismo día y mes; el 29/2 cae el 28/2 los años no bisiestos', () => {
    expect(proximaRepeticion('2020-12-03', 'anual', '2026-11-24')).toBe('2026-12-03')
    expect(proximaRepeticion('2020-03-01', 'anual', '2026-11-24')).toBe('2027-03-01')
    expect(proximaRepeticion('2024-02-29', 'anual', '2026-11-24')).toBe('2027-02-28')
    expect(proximaRepeticion('2024-02-29', 'anual', '2027-03-01')).toBe('2028-02-29')
  })
})

describe('rotuloRepeticion', () => {
  it('rótulo chico para la lista', () => {
    expect(rotuloRepeticion('diaria')).toBe('cada día')
    expect(rotuloRepeticion('semanal')).toBe('cada semana')
    expect(rotuloRepeticion('mensual')).toBe('cada mes')
    expect(rotuloRepeticion('anual')).toBe('cada año')
    expect(rotuloRepeticion('nunca')).toBe('una vez')
  })
})

describe('proximaDeFecha (Calendario)', () => {
  it('cumpleaños: todos los años, por día y mes', () => {
    expect(proximaDeFecha({ tipo: 'cumple', dia: '11-25' }, '2026-11-24')).toBe('2026-11-25')
  })
  it('"Otra" sin año ni repetición (las viejas): todos los años', () => {
    expect(proximaDeFecha({ tipo: 'otra', dia: '03-10' }, '2026-11-24')).toBe('2027-03-10')
  })
  it('"Otra" con repetición y año de la fecha', () => {
    expect(proximaDeFecha({ tipo: 'otra', dia: '11-02', anioEvento: 2026, repeticion: 'semanal' }, '2026-11-24')).toBe('2026-11-30')
    expect(proximaDeFecha({ tipo: 'otra', dia: '11-20', anioEvento: 2026, repeticion: 'nunca' }, '2026-11-24')).toBeNull()
  })
})

const rec = (r: Partial<Recordatorio>): Recordatorio => ({ id: 'r', titulo: 'R', dia: '12-25', avisarDiasAntes: 30, ...r })

describe('recordatorios con repetición y posponer', () => {
  it('posponer N días deja de mostrarlo hasta entonces', () => {
    expect(posponerPor(rec({}), '2026-11-24', 3).pospuestoHasta).toBe('2026-11-27')
    expect(posponerPor(rec({}), '2026-11-24', 15).pospuestoHasta).toBe('2026-12-09')
  })
  it('resolver uno anual o de una vez: ya no vuelve en ese año', () => {
    const r = resolverRecordatorio(rec({ repeticion: 'anual' }), '2026-11-24')
    expect(r.resueltoAnio).toBe(2026)
    expect(recordatoriosActivos([r], '2026-11-24')).toHaveLength(0)
    expect(recordatoriosActivos([r], '2027-12-01')).toHaveLength(1)
  })
  it('resolver uno semanal: vuelve para la próxima semana (los semanales avisan el mismo día)', () => {
    // lunes; aunque diga 2 días antes, un semanal avisa ese mismo día (ronda 5)
    const r = rec({ dia: '11-23', anio: 2026, repeticion: 'semanal', avisarDiasAntes: 2 })
    expect(recordatoriosActivos([r], '2026-11-29')).toHaveLength(0)
    expect(recordatoriosActivos([r], '2026-11-30').map((x) => x.proxima)).toEqual(['2026-11-30'])
    const hecho = resolverRecordatorio(r, '2026-11-30')
    expect(recordatoriosActivos([hecho], '2026-11-30')).toHaveLength(0)
    expect(recordatoriosActivos([hecho], '2026-12-06')).toHaveLength(0)
    expect(recordatoriosActivos([hecho], '2026-12-07').map((x) => x.proxima)).toEqual(['2026-12-07'])
  })
  it('uno que no se repite y ya pasó no aparece más', () => {
    expect(recordatoriosActivos([rec({ dia: '11-20', anio: 2026, repeticion: 'nunca' })], '2026-11-24')).toHaveLength(0)
  })
})
