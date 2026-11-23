import { describe, expect, it } from 'vitest'
import { cambioEdicion, cambioResolver, chipAviso, fechaLarga, ordenarAnuales, validarAccion, validarRecordatorio } from '@/domain/recordatorios'
import { validarDiaMes } from '@/domain/validarFecha'

describe('chipAviso', () => {
  it('etiquetas', () => {
    expect(chipAviso(7)).toBe('1 semana antes')
    expect(chipAviso(30)).toBe('1 mes antes')
    expect(chipAviso(60)).toBe('2 meses antes')
    expect(chipAviso(15)).toBe('15 días antes')
    expect(chipAviso(1)).toBe('1 día antes')
  })
})

describe('fechaLarga', () => {
  it('formatea MM-DD', () => {
    expect(fechaLarga('12-25')).toBe('25 de diciembre')
    expect(fechaLarga('01-01')).toBe('1 de enero')
    expect(fechaLarga(null)).toBe('Fecha a cargar')
  })
})

describe('validarDiaMes', () => {
  it('valida y arma MM-DD', () => {
    expect(validarDiaMes(5, 3)).toEqual({ ok: true, valor: '03-05' })
    expect(validarDiaMes(31, 2)).toEqual({ ok: false, error: 'Febrero no tiene 31 días.' })
    expect(validarDiaMes(1, 13).ok).toBe(false)
  })
})

describe('validarAccion', () => {
  it('solo posponer o resolver', () => {
    expect(validarAccion('posponer')).toBe('posponer')
    expect(validarAccion('resolver')).toBe('resolver')
    expect(validarAccion('borrar')).toBeNull()
    expect(validarAccion(undefined)).toBeNull()
  })
})

describe('validarRecordatorio', () => {
  it('válido', () => {
    expect(validarRecordatorio({ titulo: ' Cena ', dia: 3, mes: 4, avisarDiasAntes: 30 }))
      .toEqual({ ok: true, valor: { titulo: 'Cena', dia: '04-03', avisarDiasAntes: 30 } })
  })
  it('rechaza', () => {
    expect(validarRecordatorio({ titulo: ' ', dia: 3, mes: 4, avisarDiasAntes: 30 }).ok).toBe(false)
    expect(validarRecordatorio({ titulo: 'x'.repeat(81), dia: 3, mes: 4, avisarDiasAntes: 30 }).ok).toBe(false)
    expect(validarRecordatorio({ titulo: 'a', dia: 31, mes: 4, avisarDiasAntes: 30 }).ok).toBe(false)
    expect(validarRecordatorio({ titulo: 'a', dia: 3, mes: 4, avisarDiasAntes: 0 }).ok).toBe(false)
    expect(validarRecordatorio({ titulo: 'a', dia: 3, mes: 4, avisarDiasAntes: 366 }).ok).toBe(false)
    expect(validarRecordatorio({ titulo: 'a', dia: 3, mes: 4, avisarDiasAntes: 2.5 }).ok).toBe(false)
    expect(validarRecordatorio({ titulo: 5 as unknown as string, dia: 3, mes: 4, avisarDiasAntes: 30 }).ok).toBe(false)
  })
})

describe('sin fecha', () => {
  const base = { titulo: 'a', avisarDiasAntes: 30 }
  it('nuevo exige día y mes', () => {
    expect(validarRecordatorio({ ...base, dia: null, mes: null }).ok).toBe(false)
    expect(validarRecordatorio({ ...base, dia: 3, mes: null }).ok).toBe(false)
  })
  it('editar uno sin fecha permite dejarla en blanco', () => {
    expect(validarRecordatorio({ ...base, dia: null, mes: null }, true)).toEqual({ ok: true, valor: { titulo: 'a', dia: null, avisarDiasAntes: 30 } })
    expect(validarRecordatorio({ ...base, dia: 3, mes: null }, true).ok).toBe(false)
  })
})

describe('cambioEdicion', () => {
  const act = { id: 'x', titulo: 'Navidad', dia: '12-25', avisarDiasAntes: 60, resueltoAnio: 2026, pospuestoHasta: '2026-11-10' }
  it('limpia resuelto y pospuesto si cambia la fecha o el aviso', () => {
    expect(cambioEdicion(act, { titulo: 'Navidad', dia: '12-30', avisarDiasAntes: 60 })).toMatchObject({ dia: '12-30', resueltoAnio: null, pospuestoHasta: null })
    expect(cambioEdicion(act, { titulo: 'Navidad', dia: '12-25', avisarDiasAntes: 30 })).toMatchObject({ resueltoAnio: null, pospuestoHasta: null })
  })
  it('si solo cambia el título conserva el estado', () => {
    const c = cambioEdicion(act, { titulo: 'Otro', dia: '12-25', avisarDiasAntes: 60 })
    expect(c).toEqual({ titulo: 'Otro', dia: '12-25', avisarDiasAntes: 60 })
  })
})

describe('cambioResolver', () => {
  it('marca el año y borra la posposición', () => {
    expect(cambioResolver({ id: 'x', titulo: 't', dia: '12-25', avisarDiasAntes: 60, resueltoAnio: 2026 })).toEqual({ resueltoAnio: 2026, pospuestoHasta: null })
  })
})

describe('ordenarAnuales', () => {
  const r = (titulo: string, dia: string | null) => ({ id: titulo, titulo, dia, avisarDiasAntes: 30 })
  it('por próxima ocurrencia desde hoy, sin fecha al final, empate por título', () => {
    const lista = [r('Sin fecha B', null), r('Navidad', '12-25'), r('Cumple', '11-25'), r('Sin fecha A', null),
      r('Reyes', '01-06'), r('Fin de año', '12-31'), r('Año nuevo cena', '12-31'), r('Ayer', '11-21')]
    expect(ordenarAnuales(lista, '2026-11-22').map((x) => x.titulo)).toEqual([
      'Cumple', 'Navidad', 'Año nuevo cena', 'Fin de año', 'Reyes', 'Ayer', 'Sin fecha A', 'Sin fecha B',
    ])
  })
  it('no muta la lista original', () => {
    const lista = [r('B', '12-01'), r('A', '11-30')]
    ordenarAnuales(lista, '2026-11-22')
    expect(lista.map((x) => x.titulo)).toEqual(['B', 'A'])
  })
})
