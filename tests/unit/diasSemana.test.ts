import { describe, expect, it } from 'vitest'
import {
  diaDeSemana, diasMarcados, proximaDeFecha, proximaDeRecordatorio, proximaRepeticion, proximoDiaMarcado,
  resolverRecordatorio, rotuloDiasSemana, validarDiasSemana,
} from '@/domain/repeticion'
import { recordatoriosActivos } from '@/domain/fechas'
import { avisosDelDia } from '@/avisos/calcular'
import { cambioEdicion, validarRecordatorio } from '@/domain/recordatorios'
import { validarFecha } from '@/domain/validarFecha'
import { OPCIONES_POSPONER } from '@/domain/posponer'
import type { Recordatorio } from '@/domain/tipos'

// Noviembre de 2026: lunes 23, martes 24, miércoles 25, jueves 26, viernes 27, sábado 28, domingo 29, lunes 30.
const LUN = 1, MAR = 2, MIE = 3, JUE = 4, VIE = 5, SAB = 6, DOM = 7

describe('diaDeSemana: 1 = lunes … 7 = domingo', () => {
  it('cada día de una semana', () => {
    expect(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'].map(diaDeSemana))
      .toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(diaDeSemana('2027-01-01')).toBe(VIE)
  })
})

describe('próxima vez de "Todas las semanas" con días marcados (desde hoy, incluido hoy)', () => {
  it('si hoy está marcado, es hoy', () => {
    expect(proximoDiaMarcado([MAR], '2026-11-24')).toBe('2026-11-24')
    expect(proximoDiaMarcado([LUN, MAR, VIE], '2026-11-24')).toBe('2026-11-24')
  })
  it('si no, el próximo día marcado', () => {
    expect(proximoDiaMarcado([JUE], '2026-11-24')).toBe('2026-11-26')
    expect(proximoDiaMarcado([LUN, VIE], '2026-11-28')).toBe('2026-11-30')
  })
  it('el día marcado que ya pasó esta semana cae la semana que viene', () => {
    expect(proximoDiaMarcado([LUN], '2026-11-24')).toBe('2026-11-30')
  })
  it('cruza de mes y de año', () => {
    expect(proximoDiaMarcado([MIE], '2026-12-31')).toBe('2027-01-06')
    expect(proximoDiaMarcado([DOM], '2026-11-30')).toBe('2026-12-06')
  })
  it('todos los días marcados: siempre hoy', () => {
    expect(proximoDiaMarcado([1, 2, 3, 4, 5, 6, 7], '2026-11-28')).toBe('2026-11-28')
  })
  it('proximaRepeticion: con días, no importa el día de la semana de la fecha de inicio', () => {
    expect(proximaRepeticion('2026-11-02', 'semanal', '2026-11-24', [SAB])).toBe('2026-11-28')
    // sin días (las viejas): el mismo día de la semana que la fecha
    expect(proximaRepeticion('2026-11-02', 'semanal', '2026-11-24')).toBe('2026-11-30')
    // los días solo cuentan en "Todas las semanas"
    expect(proximaRepeticion('2026-12-10', 'anual', '2026-11-24', [SAB])).toBe('2026-12-10')
  })
  it('fecha "Otra" y recordatorio semanales con días', () => {
    expect(proximaDeFecha({ tipo: 'otra', dia: '11-24', anioEvento: 2026, repeticion: 'semanal', diasSemana: [LUN, JUE] }, '2026-11-24')).toBe('2026-11-26')
    expect(proximaDeRecordatorio({ dia: '11-24', anio: 2026, repeticion: 'semanal', diasSemana: [MAR] }, '2026-12-01')).toBe('2026-12-01')
  })
})

describe('recordatorios semanales: avisan ese mismo día', () => {
  const r: Recordatorio = { id: 'r', titulo: 'Sacar la basura', dia: '11-24', anio: 2026, avisarDiasAntes: 0, repeticion: 'semanal', diasSemana: [LUN, JUE] }
  it('aparece solo el día marcado', () => {
    expect(recordatoriosActivos([r], '2026-11-25')).toHaveLength(0)
    expect(recordatoriosActivos([r], '2026-11-26').map((x) => [x.proxima, x.dias])).toEqual([['2026-11-26', 0]])
    expect(recordatoriosActivos([r], '2026-11-30').map((x) => x.proxima)).toEqual(['2026-11-30'])
  })
  it('resuelto el jueves, vuelve el lunes', () => {
    const hecho = resolverRecordatorio(r, '2026-11-26')
    expect(recordatoriosActivos([hecho], '2026-11-26')).toHaveLength(0)
    expect(recordatoriosActivos([hecho], '2026-11-30').map((x) => x.proxima)).toEqual(['2026-11-30'])
  })
  it('el aviso del día (push) sale ese día y no antes', () => {
    const datos = { fechas: [], vencimientos: [], recordatorios: [r] }
    expect(avisosDelDia(datos, '2026-11-25')).toEqual([])
    expect(avisosDelDia(datos, '2026-11-26')).toEqual([{ titulo: 'Sacar la basura', cuerpo: 'Es hoy', url: '/recordatorios' }])
  })
  it('una fecha "Otra" semanal avisa cada día marcado', () => {
    const f = { id: 'f', nombre: 'Clase de golf', tipo: 'otra' as const, dia: '11-24', anioEvento: 2026, repeticion: 'semanal' as const, diasSemana: [SAB], hora: '10:00' }
    const datos = { fechas: [f], vencimientos: [], recordatorios: [] }
    expect(avisosDelDia(datos, '2026-11-27')).toEqual([])
    expect(avisosDelDia(datos, '2026-11-28')).toEqual([{ titulo: 'Hoy: Clase de golf', cuerpo: 'A las 10:00', url: '/calendario' }])
  })
})

describe('días marcados: validar y mostrar', () => {
  it('al menos uno, del 1 al 7; los ordena y quita repetidos', () => {
    expect(validarDiasSemana([5, 1, 5])).toEqual({ ok: true, valor: [1, 5] })
    expect(validarDiasSemana([])).toEqual({ ok: false, error: 'Elegí al menos un día.' })
    expect(validarDiasSemana([0]).ok).toBe(false)
    expect(validarDiasSemana([8]).ok).toBe(false)
    expect(validarDiasSemana([1.5]).ok).toBe(false)
    expect(validarDiasSemana('1').ok).toBe(false)
  })
  it('rótulo corto', () => {
    expect(rotuloDiasSemana([MIE])).toBe('mié')
    expect(rotuloDiasSemana([VIE, LUN])).toBe('lun y vie')
    expect(rotuloDiasSemana([LUN, MIE, VIE])).toBe('lun, mié y vie')
    expect(rotuloDiasSemana([1, 2, 3, 4, 5, 6, 7])).toBe('todos los días')
  })
  it('las semanales viejas (sin días) marcan el día de la semana de su fecha', () => {
    expect(diasMarcados({ dia: '11-23', anio: 2026 }, '2026-11-24')).toEqual([LUN])
    expect(diasMarcados({ dia: '11-23', anio: 2026, diasSemana: [MAR, SAB] }, '2026-11-24')).toEqual([MAR, SAB])
  })
})

describe('guardar con días marcados: no pide día, mes ni año', () => {
  it('Calendario "Otra": guarda hoy como inicio, los días y la hora opcional', () => {
    const e = { nombre: 'Clase', tipo: 'otra', dia: NaN, mes: NaN, repeticion: 'semanal' as const, diasSemana: [SAB, MAR] }
    expect(validarFecha(e, 2026, '2026-11-24')).toEqual({
      ok: true, valor: { nombre: 'Clase', tipo: 'otra', dia: '11-24', repeticion: 'semanal', anioEvento: 2026, diasSemana: [MAR, SAB] },
    })
    expect(validarFecha({ ...e, hora: '18:30' }, 2026, '2026-11-24')).toMatchObject({ ok: true, valor: { hora: '18:30' } })
    expect(validarFecha({ ...e, hora: '25:00' }, 2026, '2026-11-24')).toEqual({ ok: false, error: 'Revisá la hora.' })
    expect(validarFecha({ ...e, diasSemana: [] }, 2026, '2026-11-24')).toEqual({ ok: false, error: 'Elegí al menos un día.' })
  })
  it('Recordatorios: guarda el inicio, los días y aviso ese mismo día', () => {
    const e = { titulo: 'Basura', dia: null, mes: null, avisarDiasAntes: 30, repeticion: 'semanal' as const, diasSemana: [JUE, LUN], posponerDias: 1 }
    expect(validarRecordatorio(e, false, '2026-11-24')).toEqual({
      ok: true, valor: { titulo: 'Basura', dia: '11-24', avisarDiasAntes: 0, repeticion: 'semanal', anio: 2026, posponerDias: 1, diasSemana: [LUN, JUE] },
    })
    expect(validarRecordatorio({ ...e, diasSemana: [] }, false, '2026-11-24')).toEqual({ ok: false, error: 'Elegí al menos un día.' })
  })
  it('al dejar de ser semanal se borran los días marcados', () => {
    const actual: Recordatorio = { id: 'r', titulo: 'Basura', dia: '11-24', anio: 2026, avisarDiasAntes: 0, repeticion: 'semanal', diasSemana: [LUN] }
    expect(cambioEdicion(actual, { titulo: 'Basura', dia: '12-10', avisarDiasAntes: 7, repeticion: 'anual', posponerDias: 15 }))
      .toMatchObject({ diasSemana: null, anio: null, pospuestoHasta: null, resueltoAnio: null })
    // cambiar los días también limpia lo pospuesto
    expect(cambioEdicion(actual, { titulo: 'Basura', dia: '11-24', anio: 2026, avisarDiasAntes: 0, repeticion: 'semanal', posponerDias: 15, diasSemana: [LUN, JUE] }))
      .toMatchObject({ diasSemana: [LUN, JUE], pospuestoHasta: null })
  })
})

describe('Posponer: siempre de menor a mayor', () => {
  it('1 día, 3 días, 1 semana, 15 días, 1 mes', () => {
    expect(OPCIONES_POSPONER.map(([d]) => d)).toEqual([1, 3, 7, 15, 30])
    expect(OPCIONES_POSPONER.map(([, t]) => t)).toEqual(['1 día', '3 días', '1 semana', '15 días', '1 mes'])
  })
})
