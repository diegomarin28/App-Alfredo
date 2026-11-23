import { describe, expect, it } from 'vitest'
import { chipAviso, fechaLarga, validarAccion, validarRecordatorio } from '@/domain/recordatorios'
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
