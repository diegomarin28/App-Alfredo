import { describe, expect, it } from 'vitest'
import { esCumpleDeAlfredo, saludoDelMomento, tocaFlor, contarTildado } from '@/domain/detalles'

// Hora de Montevideo = UTC-3.
const mvd = (iso: string) => new Date(`${iso}-03:00`)

describe('saludoDelMomento (Inicio)', () => {
  it('Buen día / Buenas tardes / Buenas noches según la hora de Montevideo', () => {
    expect(saludoDelMomento(mvd('2026-11-24T05:00:00'))).toBe('Buen día')
    expect(saludoDelMomento(mvd('2026-11-24T11:59:00'))).toBe('Buen día')
    expect(saludoDelMomento(mvd('2026-11-24T12:00:00'))).toBe('Buenas tardes')
    expect(saludoDelMomento(mvd('2026-11-24T19:59:00'))).toBe('Buenas tardes')
    expect(saludoDelMomento(mvd('2026-11-24T20:00:00'))).toBe('Buenas noches')
    expect(saludoDelMomento(mvd('2026-11-24T04:59:00'))).toBe('Buenas noches')
  })

  it('el viernes desde las 18 h: "Buen viernes" (hasta la medianoche)', () => {
    expect(saludoDelMomento(mvd('2026-11-27T17:59:00'))).toBe('Buenas tardes')
    expect(saludoDelMomento(mvd('2026-11-27T18:00:00'))).toBe('Buen viernes')
    expect(saludoDelMomento(mvd('2026-11-27T23:30:00'))).toBe('Buen viernes')
    expect(saludoDelMomento(mvd('2026-11-28T00:30:00'))).toBe('Buenas noches')
    // otro día a las 18 h, nada de viernes
    expect(saludoDelMomento(mvd('2026-11-26T18:30:00'))).toBe('Buenas tardes')
  })
})

describe('esCumpleDeAlfredo', () => {
  it('el 25 de noviembre, cualquier año', () => {
    expect(esCumpleDeAlfredo('2026-11-25')).toBe(true)
    expect(esCumpleDeAlfredo('2027-11-25')).toBe(true)
    expect(esCumpleDeAlfredo('2026-11-24')).toBe(false)
  })
})

describe('Flor (truco): el tercer pendiente resuelto del día, una vez por día', () => {
  it('cuenta los tildados por día y avisa solo al llegar a 3, una sola vez', () => {
    let e = contarTildado(null, '2026-11-24')
    expect(e).toEqual({ dia: '2026-11-24', tildados: 1, flor: false })
    expect(tocaFlor(e)).toBe(false)
    e = contarTildado(e, '2026-11-24')
    expect(tocaFlor(e)).toBe(false)
    e = contarTildado(e, '2026-11-24')
    expect(e.tildados).toBe(3)
    expect(tocaFlor(e)).toBe(true)
    e = { ...e, flor: true }
    e = contarTildado(e, '2026-11-24')
    expect(tocaFlor(e)).toBe(false)
  })

  it('al cambiar el día arranca de nuevo', () => {
    const ayer = { dia: '2026-11-23', tildados: 5, flor: true }
    expect(contarTildado(ayer, '2026-11-24')).toEqual({ dia: '2026-11-24', tildados: 1, flor: false })
  })
})
