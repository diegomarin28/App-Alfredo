import { afterEach, describe, expect, it } from 'vitest'
import {
  diasHasta, edadQueCumple, hoy, hoyMontevideo, posponer, proximaOcurrencia,
  proximosCumples, recordatoriosActivos, resolver, setHoyDePrueba, vencimientosProximos,
} from '@/domain/fechas'
import type { Fecha, Recordatorio, Vencimiento } from '@/domain/tipos'

describe('hoyMontevideo', () => {
  it('usa la fecha de Montevideo, no la de UTC', () => {
    expect(hoyMontevideo(new Date('2026-11-26T02:30:00Z'))).toBe('2026-11-25')
  })
})

describe('hoy', () => {
  const env = process.env as Record<string, string | undefined>
  const original = { t: env.TEST_TODAY, n: env.NODE_ENV }
  afterEach(() => {
    setHoyDePrueba(null)
    if (original.t === undefined) delete env.TEST_TODAY; else env.TEST_TODAY = original.t
    env.NODE_ENV = original.n
  })
  it('sin overrides devuelve hoyMontevideo', () => {
    delete env.TEST_TODAY
    expect(hoy()).toBe(hoyMontevideo(new Date()))
  })
  it('usa TEST_TODAY fuera de producción', () => {
    env.TEST_TODAY = '2026-11-22'
    expect(hoy()).toBe('2026-11-22')
  })
  it('el override en proceso gana sobre TEST_TODAY', () => {
    env.TEST_TODAY = '2026-11-22'
    setHoyDePrueba('2026-12-01')
    expect(hoy()).toBe('2026-12-01')
    setHoyDePrueba(null)
    expect(hoy()).toBe('2026-11-22')
  })
  it('en producción ignora ambos', () => {
    env.NODE_ENV = 'production'
    env.TEST_TODAY = '2026-11-22'
    setHoyDePrueba('2026-12-01')
    expect(hoy()).toBe(hoyMontevideo(new Date()))
  })
})

describe('proximaOcurrencia', () => {
  it('casos del brief', () => {
    expect(proximaOcurrencia('11-25', '2026-11-22')).toBe('2026-11-25')
    expect(proximaOcurrencia('11-20', '2026-11-22')).toBe('2027-11-20')
    expect(proximaOcurrencia('02-29', '2026-03-01')).toBe('2027-02-28')
    expect(proximaOcurrencia('02-29', '2027-03-01')).toBe('2028-02-29')
  })
  it('hoy mismo cuenta como próxima', () => {
    expect(proximaOcurrencia('11-22', '2026-11-22')).toBe('2026-11-22')
  })
  it('29 feb en año no bisiesto antes del 28 feb', () => {
    expect(proximaOcurrencia('02-29', '2027-01-10')).toBe('2027-02-28')
  })
})

describe('diasHasta', () => {
  it('positivo, cero y negativo', () => {
    expect(diasHasta('2026-11-25', '2026-11-22')).toBe(3)
    expect(diasHasta('2026-11-22', '2026-11-22')).toBe(0)
    expect(diasHasta('2026-11-20', '2026-11-22')).toBe(-2)
  })
  it('cruza fin de año', () => {
    expect(diasHasta('2027-01-01', '2026-12-31')).toBe(1)
  })
})

const f = (o: Partial<Fecha>): Fecha => ({ id: '1', nombre: 'X', tipo: 'cumple', dia: '11-25', ...o })

describe('edadQueCumple', () => {
  it('edad en la próxima ocurrencia', () => {
    expect(edadQueCumple(f({ anioNacimiento: 1964 }), '2026-11-22')).toBe(62)
  })
  it('null sin año de nacimiento', () => {
    expect(edadQueCumple(f({}), '2026-11-22')).toBeNull()
  })
  it('si ya pasó este año, cuenta el próximo', () => {
    expect(edadQueCumple(f({ dia: '11-20', anioNacimiento: 1964 }), '2026-11-22')).toBe(63)
  })
})

describe('proximosCumples', () => {
  it('ordena por días e incluye proxima, dias, edad', () => {
    const r = proximosCumples([
      f({ id: 'b', dia: '12-10', anioNacimiento: 2000 }),
      f({ id: 'a', dia: '11-25' }),
    ], '2026-11-22')
    expect(r.map(x => x.id)).toEqual(['a', 'b'])
    expect(r[0]).toMatchObject({ proxima: '2026-11-25', dias: 3, edad: null })
    expect(r[1]).toMatchObject({ proxima: '2026-12-10', dias: 18, edad: 26 })
  })
  it('hoy es el cumple: dias 0', () => {
    expect(proximosCumples([f({ anioNacimiento: 1964 })], '2026-11-25')[0]).toMatchObject({ dias: 0, edad: 62 })
  })
  it('29 feb en año no bisiesto se celebra el 28', () => {
    const [x] = proximosCumples([f({ dia: '02-29', anioNacimiento: 1964 })], '2027-02-20')
    expect(x).toMatchObject({ proxima: '2027-02-28', dias: 8, edad: 63 })
  })
  it('incluye todas las fechas dadas, no solo cumples', () => {
    expect(proximosCumples([f({ tipo: 'otra' })], '2026-11-22')).toHaveLength(1)
  })
})

const r = (o: Partial<Recordatorio> = {}): Recordatorio => ({
  id: 'r', titulo: 'Navidad', dia: '12-25', avisarDiasAntes: 60, ...o,
})

describe('recordatoriosActivos', () => {
  it('activo a 60 días, inactivo a 61', () => {
    expect(recordatoriosActivos([r()], '2026-10-26')).toHaveLength(1)
    expect(recordatoriosActivos([r()], '2026-10-26')[0]).toMatchObject({ proxima: '2026-12-25', dias: 60 })
    expect(recordatoriosActivos([r()], '2026-10-25')).toHaveLength(0)
  })
  it('posponer 15 días', () => {
    const p = posponer(r(), '2026-10-26')
    expect(p.pospuestoHasta).toBe('2026-11-10')
    expect(recordatoriosActivos([p], '2026-10-27')).toHaveLength(0)
    expect(recordatoriosActivos([p], '2026-11-09')).toHaveLength(0)
    expect(recordatoriosActivos([p], '2026-11-10')).toHaveLength(1)
  })
  it('resolver: inactivo en 2026, activo de nuevo el 2027-10-26', () => {
    const s = resolver(r(), '2026-10-26')
    expect(s.resueltoAnio).toBe(2026)
    expect(s.pospuestoHasta).toBeUndefined()
    expect(recordatoriosActivos([s], '2026-10-26')).toHaveLength(0)
    expect(recordatoriosActivos([s], '2026-12-24')).toHaveLength(0)
    expect(recordatoriosActivos([s], '2027-10-26')).toHaveLength(1)
  })
  it('resolver limpia pospuestoHasta', () => {
    expect(resolver(posponer(r(), '2026-10-26'), '2026-11-12').pospuestoHasta).toBeUndefined()
  })
  it('dia null nunca está activo', () => {
    expect(recordatoriosActivos([r({ dia: null })], '2026-12-25')).toHaveLength(0)
  })
})

const v = (o: Partial<Vencimiento>): Vencimiento => ({
  id: 'v', titulo: 'V', ambito: 'empresa', fecha: '2026-12-01', avisarDiasAntes: 30, hecho: false, ...o,
})

describe('vencimientosProximos', () => {
  it('excluye hechos, ordena por dias, marca urgente <= 7', () => {
    const res = vencimientosProximos([
      v({ id: 'lejos', fecha: '2026-12-30' }),
      v({ id: 'hecho', fecha: '2026-11-23', hecho: true }),
      v({ id: 'ocho', fecha: '2026-11-30' }),
      v({ id: 'siete', fecha: '2026-11-29' }),
      v({ id: 'vencido', fecha: '2026-11-20' }),
    ], '2026-11-22')
    expect(res.map(x => [x.id, x.dias, x.urgente])).toEqual([
      ['vencido', -2, true], ['siete', 7, true], ['ocho', 8, false], ['lejos', 38, false],
    ])
  })
})
