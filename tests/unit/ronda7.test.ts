// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MemoryRepo } from '@/data/memoryRepo'
import { PENDIENTES_SIN_FECHA, TablaSupabase } from '@/data/supabaseRepo'
import { diaCorto, esFechaIso, fechaOpcional, fechasLegibles, sacarFechaIso } from '@/domain/fechaTexto'
import { corregirNombres, FAMILIA } from '@/domain/nombres'
import {
  aplicarEdicion, describir, edicionDe, fechaQuePide, filaPropuesta, seccionDe, SECCIONES_CONTAME, textoLegible, validarAccion, type Accion,
} from '@/ai/acciones'
import { armarPropuesta, guardarPropuesta } from '@/ai/contame'
import { construirSistema, HERRAMIENTAS } from '@/ai/contamePrompt'

const HOY = '2026-11-25' // miércoles
const ISO = /\d{4}-\d{2}-\d{2}/

describe('fechas en el texto (punto 2)', () => {
  it('se leen "lunes 30/11", nunca 2026-11-30', () => {
    expect(diaCorto('2026-11-30')).toBe('lunes 30/11')
    expect(diaCorto('2026-12-02')).toBe('miércoles 2/12')
    expect(fechasLegibles('El lunes 2026-11-30 ir a Canelones; el 2026-12-02 vuelvo')).toBe('El lunes 30/11 ir a Canelones; el miércoles 2/12 vuelvo')
    expect(fechasLegibles('Sin fecha')).toBe('Sin fecha')
    expect(fechasLegibles('2026-02-30 no existe')).toBe('2026-02-30 no existe')
  })

  it('sacarFechaIso: el texto queda limpio y la fecha va aparte', () => {
    expect(sacarFechaIso('El lunes 2026-11-30 ir a Canelones a la reunión')).toEqual({ texto: 'Ir a Canelones a la reunión', fecha: '2026-11-30' })
    expect(sacarFechaIso('Pagar la luz para el 2026-12-02.')).toEqual({ texto: 'Pagar la luz', fecha: '2026-12-02' })
    expect(sacarFechaIso('Llamar al contador, 2026-12-02, por el IRPF')).toEqual({ texto: 'Llamar al contador por el IRPF', fecha: '2026-12-02' })
    expect(sacarFechaIso('Llamar al contador')).toEqual({ texto: 'Llamar al contador', fecha: null })
    // si no queda texto, no se saca nada
    expect(sacarFechaIso('2026-12-02')).toEqual({ texto: '2026-12-02', fecha: null })
  })

  it('esFechaIso y fechaOpcional', () => {
    expect(esFechaIso('2026-11-30')).toBe(true)
    expect(esFechaIso('2026-02-29')).toBe(false)
    expect(esFechaIso('30/11/2026')).toBe(false)
    expect(fechaOpcional('')).toEqual({ ok: true, valor: null })
    expect(fechaOpcional(null)).toEqual({ ok: true, valor: null })
    expect(fechaOpcional('2026-11-30')).toEqual({ ok: true, valor: '2026-11-30' })
    expect(fechaOpcional('2026-13-01')).toEqual({ ok: false, error: 'Revisá la fecha.' })
  })

  it('una tarea con la fecha en el texto: se saca del texto y va aparte', () => {
    const a = validarAccion({ tipo: 'pendiente', texto: 'El lunes 2026-11-30 ir a Canelones a buscar los papeles' }, HOY)
    expect(a).toEqual({ tipo: 'pendiente', texto: 'Ir a Canelones a buscar los papeles', fecha: '2026-11-30' })
    expect(describir(a!)).toBe('Tareas pendientes: Ir a Canelones a buscar los papeles (lunes 30/11)')
    expect(filaPropuesta(a!)).toEqual({ seccion: 'Tareas pendientes', texto: 'Ir a Canelones a buscar los papeles (lunes 30/11)' })
  })

  it('una tarea con fecha en su campo; una fecha que no existe no se guarda', () => {
    expect(validarAccion({ tipo: 'pendiente', texto: 'Llamar al contador', fecha: '2026-12-02' }, HOY)).toEqual({ tipo: 'pendiente', texto: 'Llamar al contador', fecha: '2026-12-02' })
    expect(validarAccion({ tipo: 'pendiente', texto: 'Llamar al contador', fecha: 'el lunes' }, HOY)).toBeNull()
    expect(validarAccion({ tipo: 'pendiente', texto: 'Llamar al contador', fecha: '' }, HOY)).toEqual({ tipo: 'pendiente', texto: 'Llamar al contador' })
  })

  it('un evento (reunión, viaje) va al Calendario como "Otra" sin repetición, con el texto limpio', () => {
    const a = validarAccion({ tipo: 'evento', titulo: 'Reunión en Canelones', fecha: '2026-11-30', hora: '10:30' }, HOY)
    expect(a).toEqual({ tipo: 'fecha', tipoFecha: 'otra', nombre: 'Reunión en Canelones', dia: '11-30', repeticion: 'nunca', anioEvento: 2026, hora: '10:30' })
    expect(describir(a!)).toBe('Calendario: Reunión en Canelones (lunes 30/11, 10:30)')
    expect(seccionDe(a!)).toBe('unaVez')
    // sin hora, y con la fecha metida en el título
    const b = validarAccion({ tipo: 'evento', titulo: 'El lunes 2026-11-30 reunión en Canelones', fecha: '2026-11-30' }, HOY)
    expect(b).toMatchObject({ nombre: 'Reunión en Canelones', dia: '11-30', anioEvento: 2026 })
    expect(b).not.toHaveProperty('hora')
    // mal: sin fecha, fecha que no existe u hora rara
    expect(validarAccion({ tipo: 'evento', titulo: 'Viaje', fecha: '' }, HOY)).toBeNull()
    expect(validarAccion({ tipo: 'evento', titulo: 'Viaje', fecha: '2026-02-30' }, HOY)).toBeNull()
    expect(validarAccion({ tipo: 'evento', titulo: 'Viaje', fecha: '2026-12-01', hora: '25:00' }, HOY)).toBeNull()
  })

  it('lo que vuelve de la revisión ("Guardar todo") se valida igual y conserva una vez, año y hora', () => {
    const a = validarAccion({ tipo: 'evento', titulo: 'Viaje a Salto', fecha: '2027-01-15', hora: '08:00' }, HOY)!
    expect(validarAccion(JSON.parse(JSON.stringify(a)), HOY)).toEqual(a)
    // una "otra" de todos los años sigue igual
    expect(validarAccion({ tipo: 'fecha', tipoFecha: 'otra', nombre: 'Aniversario', dia: '05-10' }, HOY)).toMatchObject({ tipoFecha: 'otra', dia: '05-10', repeticion: 'anual' })
  })

  it('en cualquier otro texto, y en "No entendí", la fecha se lee "lunes 30/11"', () => {
    expect(validarAccion({ tipo: 'nota', texto: 'Anotá que el 2026-11-30 viene el técnico' }, HOY)).toEqual({ tipo: 'nota', texto: 'Anotá que el lunes 30/11 viene el técnico' })
    expect(textoLegible({ tipo: 'vencimiento', titulo: 'Patente', fecha: '2026-11-30' })).toBe('Patente · lunes 30/11')
    const p = armarPropuesta(
      [{ tipo: 'pendiente', texto: 'El lunes 2026-11-30 ir a Canelones' }],
      ['algo del 2026-12-02 que no entendí'], 'texto', HOY,
    )
    expect(p.acciones).toEqual([{ tipo: 'pendiente', texto: 'Ir a Canelones', fecha: '2026-11-30' }])
    expect(p.noEntendi).toEqual(['algo del miércoles 2/12 que no entendí'])
    for (const a of p.acciones) expect(filaPropuesta(a).texto).not.toMatch(ISO)
  })

  it('el prompt: acción evento, fecha aparte en la tarea y la regla 13', () => {
    const variantes = (HERRAMIENTAS[0].input_schema as { properties: { acciones: { items: { anyOf: { properties: Record<string, unknown> }[] } } } })
      .properties.acciones.items.anyOf
    const evento = variantes.find((v) => (v.properties.tipo as { const: string }).const === 'evento')!
    expect(Object.keys(evento.properties)).toEqual(['tipo', 'titulo', 'fecha', 'hora'])
    const pendiente = variantes.find((v) => (v.properties.tipo as { const: string }).const === 'pendiente')!
    expect(Object.keys(pendiente.properties)).toEqual(['tipo', 'texto', 'fecha'])
    expect(construirSistema()).toContain('13. Nunca escribas fechas dentro de los textos')
  })
})

describe('guardar: la tarea con fecha y el evento del Calendario', () => {
  it('se guardan con la fecha aparte', async () => {
    const repo = new MemoryRepo()
    const r = await guardarPropuesta(repo, [
      { tipo: 'pendiente', texto: 'Llamar al contador', fecha: '2026-12-02' },
      { tipo: 'fecha', tipoFecha: 'otra', nombre: 'Reunión en Canelones', dia: '11-30', repeticion: 'nunca', anioEvento: 2026, hora: '10:30' },
    ], HOY)
    expect(r).not.toHaveProperty('error')
    const [t] = await repo.pendientes.list()
    expect(t).toMatchObject({ texto: 'Llamar al contador', fecha: '2026-12-02', hecho: false })
    const [f] = await repo.fechas.list()
    expect(f).toMatchObject({ nombre: 'Reunión en Canelones', tipo: 'otra', dia: '11-30', repeticion: 'nunca', anioEvento: 2026, hora: '10:30' })
  })
})

describe('"No entendí" editable (punto 1): la misma hoja que las otras filas', () => {
  const duda: Accion = { tipo: 'pendiente', texto: 'el coso del garaje' }

  it('"Va en" ofrece tarea, nota, Calendario (cumple, una vez, todos los años), recordatorio, vencimiento, contacto y casas', () => {
    const secciones = SECCIONES_CONTAME.map(([s]) => s)
    for (const s of ['pendiente', 'nota', 'cumple', 'unaVez', 'otra', 'recordatorio', 'vencEmpresa', 'contacto', 'eventoPortofino', 'personaMalibu', 'servicioPortofino']) {
      expect(secciones).toContain(s)
    }
    expect(fechaQuePide('unaVez')).toBe('completa')
    expect(fechaQuePide('pendiente')).toBe('completaOpcional')
  })

  it('arranca como tarea y se puede mandar a cualquier sección, con su fecha', () => {
    expect(edicionDe(duda, HOY)).toEqual({ seccion: 'pendiente', texto: 'el coso del garaje', fecha: null })
    const comoEvento = aplicarEdicion(duda, { seccion: 'unaVez', texto: 'Arreglar el garaje', fecha: { anio: 2026, mes: 12, dia: 5 }, hora: '09:00' }, HOY)
    expect(comoEvento).toEqual({ ok: true, accion: { tipo: 'fecha', tipoFecha: 'otra', nombre: 'Arreglar el garaje', dia: '12-05', repeticion: 'nunca', anioEvento: 2026, hora: '09:00' } })
    const comoTarea = aplicarEdicion(duda, { seccion: 'pendiente', texto: 'Arreglar el garaje', fecha: { anio: 2026, mes: 12, dia: 5 } }, HOY)
    expect(comoTarea).toEqual({ ok: true, accion: { tipo: 'pendiente', texto: 'Arreglar el garaje', fecha: '2026-12-05' } })
    expect(aplicarEdicion(duda, { seccion: 'pendiente', texto: 'Arreglar el garaje', fecha: null }, HOY)).toEqual({ ok: true, accion: { tipo: 'pendiente', texto: 'Arreglar el garaje' } })
    expect(aplicarEdicion(duda, { seccion: 'contacto', texto: 'Garajes Pérez', fecha: null }, HOY)).toEqual({ ok: true, accion: { tipo: 'contacto', nombre: 'Garajes Pérez' } })
    expect(aplicarEdicion(duda, { seccion: 'nota', texto: 'El coso del garaje', fecha: null }, HOY)).toEqual({ ok: true, accion: { tipo: 'nota', texto: 'El coso del garaje' } })
  })

  it('errores claros: falta la fecha, fecha que no existe, hora rara', () => {
    expect(aplicarEdicion(duda, { seccion: 'unaVez', texto: 'Viaje', fecha: null }, HOY)).toEqual({ ok: false, error: 'Elegí la fecha.' })
    expect(aplicarEdicion(duda, { seccion: 'pendiente', texto: 'X', fecha: { anio: 2026, mes: 2, dia: 30 } }, HOY)).toEqual({ ok: false, error: 'Revisá la fecha.' })
    expect(aplicarEdicion(duda, { seccion: 'unaVez', texto: 'Viaje', fecha: { anio: 2026, mes: 12, dia: 1 }, hora: '9' }, HOY)).toEqual({ ok: false, error: 'Revisá la hora.' })
  })

  it('una fila "una vez" se abre con su fecha y su hora', () => {
    const a: Accion = { tipo: 'fecha', tipoFecha: 'otra', nombre: 'Reunión', dia: '11-30', repeticion: 'nunca', anioEvento: 2026, hora: '10:30' }
    expect(edicionDe(a, HOY)).toEqual({ seccion: 'unaVez', texto: 'Reunión', fecha: { anio: 2026, mes: 11, dia: 30 }, hora: '10:30' })
    const t: Accion = { tipo: 'pendiente', texto: 'Llamar', fecha: '2026-12-02' }
    expect(edicionDe(t, HOY).fecha).toEqual({ anio: 2026, mes: 12, dia: 2 })
  })
})

describe('familia (punto 3): sin Paula', () => {
  it('Pau es Paulina; Paula ya no corrige', () => {
    expect(FAMILIA).not.toContain('Paula')
    expect(FAMILIA).toContain('Pau')
    expect(FAMILIA).toContain('Paulina')
    expect(corregirNombres('Paula Enrique')).toBe('Paula Enrique')
    expect(corregirNombres('Pau Enrique')).toBe('Pau Gericke')
    expect(corregirNombres('Paulina Enrique')).toBe('Paulina Gericke')
  })
})

describe('migración 0010 sin aplicar: la tarea se guarda igual', () => {
  it('plegar: sin la columna, la fecha queda al final del texto', () => {
    expect(PENDIENTES_SIN_FECHA.plegar({ texto: 'Llamar al contador', fecha: '2026-11-30', hecho: false })).toEqual({ texto: 'Llamar al contador (lunes 30/11)', hecho: false })
    expect(PENDIENTES_SIN_FECHA.plegar({ texto: 'Llamar', fecha: null })).toEqual({ texto: 'Llamar' })
  })

  /** PostgREST sin la columna fecha: PGRST204 si la fila la trae. */
  function dbSinFecha() {
    const enviadas: Record<string, unknown>[] = []
    const db = {
      from: () => {
        let fila: Record<string, unknown> = {}
        const b: Record<string, unknown> = {}
        const responder = () => ('fecha' in fila
          ? { data: null, error: { code: 'PGRST204', message: "Could not find the 'fecha' column of 'pendientes' in the schema cache" } }
          : { data: { id: 'p1', ...fila }, error: null })
        b.insert = (f: Record<string, unknown>) => { fila = f; enviadas.push(f); return b }
        b.update = (f: Record<string, unknown>) => { fila = f; enviadas.push(f); return b }
        b.eq = () => b
        b.select = () => b
        b.single = async () => responder()
        b.maybeSingle = async () => responder()
        return b
      },
    }
    return { db: db as unknown as SupabaseClient, enviadas }
  }

  it('create y update reintentan sin la columna', async () => {
    const { db, enviadas } = dbSinFecha()
    const t = new TablaSupabase<{ id: string; texto: string; fecha?: string; hecho: boolean }>(db, 'pendientes', { sinColumna: PENDIENTES_SIN_FECHA })
    expect(await t.create({ texto: 'Llamar al contador', fecha: '2026-11-30', hecho: false })).toEqual({ id: 'p1', texto: 'Llamar al contador (lunes 30/11)', hecho: false })
    expect(await t.update('p1', { texto: 'Llamar', fecha: null } as never)).toEqual({ id: 'p1', texto: 'Llamar' })
    expect(enviadas).toHaveLength(4)
  })

  it('sin la opción (u otro error), falla como siempre', async () => {
    const { db } = dbSinFecha()
    const t = new TablaSupabase<{ id: string; texto: string; fecha?: string }>(db, 'pendientes')
    await expect(t.create({ texto: 'X', fecha: '2026-11-30' })).rejects.toThrow(/pendientes\.create/)
  })
})
