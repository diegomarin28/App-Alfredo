import { describe, expect, it } from 'vitest'
import { validarFecha } from '@/domain/validarFecha'

const base = { nombre: ' Ana ', dia: 25, mes: 11 }

describe('validarFecha (Calendario: Cumpleaños u Otra, con repetición)', () => {
  it('cumpleaños: día y mes, año de nacimiento opcional; se repite siempre (no guarda repetición)', () => {
    expect(validarFecha({ ...base, tipo: 'cumple' }, 2026)).toEqual({ ok: true, valor: { nombre: 'Ana', tipo: 'cumple', dia: '11-25' } })
    expect(validarFecha({ ...base, tipo: 'cumple', anio: 1990 }, 2026)).toEqual({ ok: true, valor: { nombre: 'Ana', tipo: 'cumple', dia: '11-25', anioNacimiento: 1990 } })
  })

  it('ya no hay "aniversario"', () => {
    expect(validarFecha({ ...base, tipo: 'aniversario' }, 2026).ok).toBe(false)
  })

  it('otra: guarda la repetición, el año de la fecha y la hora si la hay', () => {
    expect(validarFecha({ ...base, nombre: 'Reunión', tipo: 'otra', repeticion: 'semanal', anio: 2026, hora: '18:30' }, 2026))
      .toEqual({ ok: true, valor: { nombre: 'Reunión', tipo: 'otra', dia: '11-25', repeticion: 'semanal', anioEvento: 2026, hora: '18:30' } })
    expect(validarFecha({ ...base, nombre: 'Aniversario', tipo: 'otra', repeticion: 'anual' }, 2026))
      .toEqual({ ok: true, valor: { nombre: 'Aniversario', tipo: 'otra', dia: '11-25', repeticion: 'anual' } })
  })

  it('otra que no se repite: pide el año (fecha completa)', () => {
    expect(validarFecha({ ...base, tipo: 'otra', repeticion: 'nunca' }, 2026)).toEqual({ ok: false, error: 'Elegí el año.' })
    expect(validarFecha({ ...base, tipo: 'otra', repeticion: 'nunca', anio: 2027 }, 2026).ok).toBe(true)
  })

  it('repetición y hora inválidas', () => {
    expect(validarFecha({ ...base, tipo: 'otra', repeticion: 'quincenal' as never }, 2026).ok).toBe(false)
    expect(validarFecha({ ...base, tipo: 'otra', repeticion: 'anual', hora: '25:00' }, 2026)).toEqual({ ok: false, error: 'Revisá la hora.' })
  })

  it('29 de febrero en un año que no es bisiesto, si no se repite', () => {
    expect(validarFecha({ nombre: 'X', tipo: 'otra', dia: 29, mes: 2, repeticion: 'nunca', anio: 2027 }, 2026)).toEqual({ ok: false, error: 'Febrero de 2027 no tiene 29 días.' })
  })
})
