import { describe, expect, it } from 'vitest'
import { paraCompletar, VISIBLES_COMPLETAR } from '@/domain/completar'
import { proximaDeFecha } from '@/domain/repeticion'
import { proximosCumples } from '@/domain/fechas'
import type { Contacto, Fecha, ServicioCasa } from '@/domain/tipos'

const fecha = (f: Partial<Fecha>): Fecha => ({ id: 'f', nombre: 'Ana', tipo: 'cumple', dia: '03-05', ...f })
const servicio = (s: Partial<ServicioCasa>): ServicioCasa => ({ id: 's', casa: 'portofino', clave: 'UTE', valor: 'Cuenta 1', ...s })
const contacto = (c: Partial<Contacto>): Contacto => ({ id: 'c', nombre: 'Pedro', telefono: '59899123456', ...c })
const vacio = { fechas: [], servicios: [], contactos: [] }

describe('"Para completar": qué entra en la lista', () => {
  it('nada a medias: la lista está vacía (la tarjeta no aparece)', () => {
    expect(paraCompletar(vacio)).toEqual([])
    expect(paraCompletar({ fechas: [fecha({})], servicios: [servicio({})], contactos: [contacto({})] })).toEqual([])
  })

  it('cumpleaños sin fecha: "Cumple de Ariel Luz, falta la fecha"', () => {
    expect(paraCompletar({ ...vacio, fechas: [fecha({ id: 'a', nombre: 'Ariel Luz', dia: null })] }))
      .toEqual([{ tipo: 'fecha', id: 'a', titulo: 'Cumple de Ariel Luz', falta: 'falta la fecha' }])
  })

  it('una fecha "otra" sin día no entra (solo los cumpleaños)', () => {
    expect(paraCompletar({ ...vacio, fechas: [fecha({ tipo: 'otra', dia: null })] })).toEqual([])
  })

  it('servicio sin número (o vacío): "Prosegur, falta el número", con su casa', () => {
    const r = paraCompletar({ ...vacio, servicios: [servicio({ id: 'p', clave: 'Prosegur', casa: 'malibu', valor: null }), servicio({ id: 'b', clave: 'Riego', valor: '  ' })] })
    expect(r).toEqual([
      { tipo: 'servicio', id: 'p', titulo: 'Prosegur', falta: 'falta el número', casa: 'malibu' },
      { tipo: 'servicio', id: 'b', titulo: 'Riego', falta: 'falta el número', casa: 'portofino' },
    ])
  })

  it('contacto sin teléfono: "Anabel, falta el teléfono"', () => {
    expect(paraCompletar({ ...vacio, contactos: [contacto({ id: 'n', nombre: 'Anabel', telefono: undefined })] }))
      .toEqual([{ tipo: 'contacto', id: 'n', titulo: 'Anabel', falta: 'falta el teléfono' }])
  })

  it('lo omitido no vuelve a entrar', () => {
    expect(paraCompletar({
      fechas: [fecha({ dia: null, completarOmitido: true })],
      servicios: [servicio({ valor: null, completarOmitido: true })],
      contactos: [contacto({ telefono: undefined, completarOmitido: true })],
    })).toEqual([])
  })

  it('orden: cumpleaños, servicios y contactos; cada grupo por nombre', () => {
    const r = paraCompletar({
      fechas: [fecha({ id: 'f2', nombre: 'Zulema', dia: null }), fecha({ id: 'f1', nombre: 'Ariel Luz', dia: null })],
      servicios: [servicio({ id: 's1', clave: 'Prosegur', valor: null })],
      contactos: [contacto({ id: 'c2', nombre: 'Óscar', telefono: undefined }), contacto({ id: 'c1', nombre: 'Anabel', telefono: undefined })],
    })
    expect(r.map((i) => i.id)).toEqual(['f1', 'f2', 's1', 'c1', 'c2'])
  })

  it('se ven 3 antes de "Ver todo"', () => {
    expect(VISIBLES_COMPLETAR).toBe(3)
  })
})

describe('los cumpleaños sin fecha no van al Calendario ni a "Lo próximo"', () => {
  it('no tienen próxima vez', () => {
    expect(proximaDeFecha(fecha({ dia: null }), '2026-11-24')).toBeNull()
    expect(proximosCumples([fecha({ id: 'x', dia: null }), fecha({ id: 'y', dia: '12-01' })], '2026-11-24').map((c) => c.id)).toEqual(['y'])
  })
})
