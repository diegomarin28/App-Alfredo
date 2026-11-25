// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { cantidad, enDias, textoEdad } from '@/domain/cantidades'
import { iconoServicio } from '@/domain/iconoServicio'
import { CORRECCIONES, FAMILIA, corregirNombres, limpiarNombreCumple, nombresFamilia } from '@/domain/nombres'
import { esMuletilla, sinMuletillas } from '@/domain/muletillas'
import { aplicarEdicion, edicionDe, fechaQuePide, filaPropuesta, seccionDe, SECCIONES_CONTAME, type Accion } from '@/ai/acciones'
import { chipAviso } from '@/domain/recordatorios'
import { chipVencimiento } from '@/domain/vencimientos'
import { avisosDelDia } from '@/avisos/calcular'
import { telParaEditar } from '@/domain/telefono'

const HOY = '2026-11-24'

describe('cantidades en singular (punto 5)', () => {
  it('1 año, 1 día, 1 tarea; el resto en plural', () => {
    expect(cantidad(1, 'año')).toBe('1 año')
    expect(cantidad(2, 'año')).toBe('2 años')
    expect(cantidad(1, 'día')).toBe('1 día')
    expect(cantidad(0, 'día')).toBe('0 días')
    expect(cantidad(1, 'tarea')).toBe('1 tarea')
    expect(cantidad(3, 'tarea pendiente')).toBe('3 tareas pendientes')
    expect(cantidad(1, 'mes')).toBe('1 mes')
    expect(cantidad(2, 'mes')).toBe('2 meses')
    expect(cantidad(1, 'foto')).toBe('1 foto')
    expect(cantidad(1, 'cargada')).toBe('1 cargada')
  })
  it('"Cumpleaños · 1 años" pasa a "cumple 1 año"', () => {
    expect(textoEdad(1)).toBe('cumple 1 año')
    expect(textoEdad(80)).toBe('cumple 80 años')
    expect(textoEdad(0)).toBe('')
    expect(textoEdad(null)).toBe('')
  })
  it('días: Hoy, Mañana, En 2 días, Venció ayer / hace 1 día', () => {
    expect(enDias(0)).toBe('Hoy')
    expect(enDias(1)).toBe('Mañana')
    expect(enDias(2)).toBe('En 2 días')
    expect(enDias(-1)).toBe('Venció ayer')
    expect(enDias(-1, { ayer: false })).toBe('Venció hace 1 día')
    expect(enDias(-5)).toBe('Venció hace 5 días')
    expect(chipVencimiento(-1)).toBe('Venció hace 1 día')
    expect(chipAviso(1)).toBe('1 día antes')
    expect(chipAviso(7)).toBe('1 semana antes')
    expect(chipAviso(14)).toBe('2 semanas antes')
    expect(chipAviso(30)).toBe('1 mes antes')
    expect(chipAviso(60)).toBe('2 meses antes')
  })
  it('avisos del día: "Falta 1 día", "Faltan 2 días"', () => {
    const avisos = avisosDelDia({
      fechas: [], vencimientos: [],
      recordatorios: [
        { id: 'a', titulo: 'Uno', dia: '11-25', avisarDiasAntes: 30 },
        { id: 'b', titulo: 'Dos', dia: '11-26', avisarDiasAntes: 30 },
      ],
    }, HOY)
    expect(avisos.map((a) => a.cuerpo)).toEqual(['Falta 1 día', 'Faltan 2 días'])
  })
})

describe('íconos de servicios (punto 6)', () => {
  it.each([
    ['UTE', 'rayo'], ['Luz', 'rayo'], ['OSE', 'gota'], ['Agua', 'gota'],
    ['DirecTV', 'tele'], ['TV cable', 'tele'], ['Televisión', 'tele'],
    ['Internet', 'wifi'], ['WiFi', 'wifi'], ['Wi-Fi', 'wifi'], ['Antel fibra', 'wifi'],
    ['Prosegur', 'escudo'], ['Alarma', 'escudo'], ['Seguridad', 'escudo'],
    ['Teléfono fijo', 'telefono'],
    ['Riego', 'herramienta'], ['Piscina', 'herramienta'], ['Gas', 'herramienta'],
  ])('%s → %s', (clave, icono) => {
    expect(iconoServicio(clave)).toBe(icono)
  })
  it('no confunde palabras que contienen las siglas', () => {
    expect(iconoServicio('Computadora')).toBe('herramienta') // "ute" adentro
    expect(iconoServicio('Rosedal')).toBe('herramienta') // "ose" adentro
  })
})

describe('nombres bien escritos (punto 3)', () => {
  it('Henrique → Gericke siempre', () => {
    expect(corregirNombres('Llamar a Alfredo Henrique')).toBe('Llamar a Alfredo Gericke')
    expect(corregirNombres('el cumple de henrique')).toBe('el cumple de Gericke')
    expect(corregirNombres('Henriqueta viene mañana')).toBe('Henriqueta viene mañana')
  })
  it('Enrique → Gericke solo después de un nombre de la familia', () => {
    expect(corregirNombres('Pau Enrique llega el lunes')).toBe('Pau Gericke llega el lunes')
    expect(corregirNombres('Alfredo enrique')).toBe('Alfredo Gericke')
    expect(corregirNombres('Llamar a Enrique el plomero')).toBe('Llamar a Enrique el plomero')
    expect(corregirNombres('Juan Enrique Pérez')).toBe('Juan Enrique Pérez')
  })
  it('la familia: Alfredo, Pau, Paula, Paulina, María, Santiago, Álvaro, Ignacio, Alfonso y Eugenia', () => {
    const familia = ['Alfredo', 'Pau', 'Paula', 'Paulina', 'María', 'Santiago', 'Álvaro', 'Ignacio', 'Alfonso', 'Eugenia']
    expect(FAMILIA).toEqual(familia)
    for (const n of familia) expect(corregirNombres(`Llamar a ${n} Enrique mañana`)).toBe(`Llamar a ${n} Gericke mañana`)
    // con o sin tildes, y en minúscula, como lo escribe el dictado
    expect(corregirNombres('Alvaro Enrique')).toBe('Alvaro Gericke')
    expect(corregirNombres('maria enrique')).toBe('maria Gericke')
    // otro nombre no cambia
    expect(corregirNombres('Mario Enrique')).toBe('Mario Enrique')
    expect(corregirNombres('Mariano Enrique')).toBe('Mariano Enrique')
  })
  it('la familia suma a quien esté guardado con el apellido', () => {
    expect(nombresFamilia(['Sofía Gericke', 'Ana Pérez', 'Gericke'])).toContain('Sofía')
    expect(nombresFamilia(['Ana Pérez'])).not.toContain('Ana')
    expect(corregirNombres('Sofía Enrique', ['Sofía Gericke'])).toBe('Sofía Gericke')
    expect(corregirNombres('Sofía Enrique')).toBe('Sofía Enrique')
  })
  it('el diccionario está en código', () => {
    expect(CORRECCIONES).toEqual([
      { mal: 'Henrique', bien: 'Gericke' },
      { mal: 'Enrique', bien: 'Gericke', despuesDeFamilia: true },
    ])
  })
  it('cumpleaños: el nombre sin la relación', () => {
    expect(limpiarNombreCumple('Juan (hijo)')).toBe('Juan')
    expect(limpiarNombreCumple('mi hijo Juan')).toBe('Juan')
    expect(limpiarNombreCumple('Juan, mi hijo')).toBe('Juan')
    expect(limpiarNombreCumple('Sofía (nieta) Gericke')).toBe('Sofía Gericke')
    expect(limpiarNombreCumple('Tía Marta')).toBe('Marta')
    expect(limpiarNombreCumple('Ana Pérez')).toBe('Ana Pérez')
    expect(limpiarNombreCumple('Mario Hijo')).toBe('Mario')
    expect(limpiarNombreCumple('(hijo)')).toBe('(hijo)')
    // no corta nombres que empiezan igual que una relación
    expect(limpiarNombreCumple('Marisa')).toBe('Marisa')
    expect(limpiarNombreCumple('Tiago')).toBe('Tiago')
  })
})

describe('muletillas (punto 2)', () => {
  it.each(['hay una vez', 'Hay una vez.', 'perdón', 'eh', 'Eh...', 'vamos a crearlo', 'o sea', 'bueno, eh, este', 'no, no, perdón', '¿a ver?', '', '   '])(
    '"%s" se descarta', (t) => { expect(esMuletilla(t)).toBe(true) },
  )
  it.each(['Comprar pilas', 'Llamar al escribano', 'Este viernes pagar UTE', 'No olvidar la llave', 'Ver la moto'])(
    '"%s" se guarda', (t) => { expect(esMuletilla(t)).toBe(false) },
  )
  it('saca los sonidos del principio', () => {
    expect(sinMuletillas('Eh, comprar pilas')).toBe('Comprar pilas')
    expect(sinMuletillas('emm... llamar a Ana')).toBe('Llamar a Ana')
    expect(sinMuletillas('comprar pilas')).toBe('comprar pilas')
    expect(sinMuletillas('Este viernes pagar UTE')).toBe('Este viernes pagar UTE')
  })
})

describe('revisión de Contame: editar una fila (punto 2)', () => {
  const pend: Accion = { tipo: 'pendiente', texto: 'Llamar a Ana' }
  const venc: Accion = { tipo: 'vencimiento', titulo: 'Patente', ambito: 'personal', fecha: '2026-12-10', avisarDiasAntes: 15 }
  const persona: Accion = { tipo: 'personaCasa', casa: 'malibu', nombre: 'Raúl', rol: 'Jardinero', detalle: 'los martes', telefono: '59899123456' }

  it('cada acción tiene su sección y la lista de secciones las cubre a todas', () => {
    const todas = SECCIONES_CONTAME.map(([s]) => s)
    for (const a of [pend, venc, persona, { tipo: 'fecha', nombre: 'A', tipoFecha: 'cumple', dia: null } as Accion]) {
      expect(todas).toContain(seccionDe(a))
    }
    expect(seccionDe(persona)).toBe('personaMalibu')
    expect(fechaQuePide('vencPersonal')).toBe('completa')
    expect(fechaQuePide('recordatorio')).toBe('diaMes')
    expect(fechaQuePide('cumple')).toBe('diaMesOpcional')
    expect(fechaQuePide('pendiente')).toBeNull()
  })

  it('edicionDe: texto, fecha y sección cargados', () => {
    expect(edicionDe(venc, HOY)).toEqual({ seccion: 'vencPersonal', texto: 'Patente', fecha: { anio: 2026, mes: 12, dia: 10 } })
    expect(edicionDe({ tipo: 'recordatorio', titulo: 'Seguro', dia: '03-01', avisarDiasAntes: 30 }, HOY).fecha).toEqual({ anio: 2026, mes: 3, dia: 1 })
    expect(edicionDe(persona, HOY)).toMatchObject({ seccion: 'personaMalibu', texto: 'Raúl', rol: 'Jardinero', fecha: null })
  })

  it('cambiar el texto y la fecha', () => {
    const r = aplicarEdicion(venc, { seccion: 'vencPersonal', texto: 'Patente del auto', fecha: { anio: 2027, mes: 1, dia: 5 } }, HOY)
    expect(r).toEqual({ ok: true, accion: { ...venc, titulo: 'Patente del auto', fecha: '2027-01-05' } })
  })

  it('cambiar de sección: una tarea pasa a vencimiento (pide fecha) y a nota', () => {
    expect(aplicarEdicion(pend, { seccion: 'vencEmpresa', texto: 'Llamar a Ana', fecha: null }, HOY)).toEqual({ ok: false, error: 'Elegí la fecha.' })
    expect(aplicarEdicion(pend, { seccion: 'vencEmpresa', texto: 'BPS', fecha: { anio: 2026, mes: 12, dia: 1 } }, HOY))
      .toEqual({ ok: true, accion: { tipo: 'vencimiento', titulo: 'BPS', ambito: 'empresa', fecha: '2026-12-01', avisarDiasAntes: 7 } })
    expect(aplicarEdicion(pend, { seccion: 'nota', texto: 'Llamar a Ana', fecha: null }, HOY)).toEqual({ ok: true, accion: { tipo: 'nota', texto: 'Llamar a Ana' } })
  })

  it('cambiar de casa conserva lo demás; "Quién se ocupa" pide qué hace', () => {
    const r = aplicarEdicion(persona, { seccion: 'personaPortofino', texto: 'Raúl', fecha: null, rol: 'Jardinero' }, HOY)
    expect(r).toEqual({ ok: true, accion: { ...persona, casa: 'portofino' } })
    expect(aplicarEdicion(pend, { seccion: 'personaPortofino', texto: 'Raúl', fecha: null }, HOY)).toEqual({ ok: false, error: 'Escribí qué hace.' })
  })

  it('cumpleaños: la fecha es opcional y el nombre sale sin la relación', () => {
    expect(aplicarEdicion(pend, { seccion: 'cumple', texto: 'Juan (hijo)', fecha: null }, HOY))
      .toEqual({ ok: true, accion: { tipo: 'fecha', tipoFecha: 'cumple', nombre: 'Juan', dia: null } })
    expect(aplicarEdicion(pend, { seccion: 'otra', texto: 'Aniversario', fecha: null }, HOY)).toEqual({ ok: false, error: 'Elegí el día y el mes.' })
  })

  it('errores claros: sin texto, fecha imposible, tarea muy larga', () => {
    expect(aplicarEdicion(pend, { seccion: 'pendiente', texto: '  ', fecha: null }, HOY)).toEqual({ ok: false, error: 'Escribí el texto.' })
    expect(aplicarEdicion(pend, { seccion: 'contacto', texto: '', fecha: null }, HOY)).toEqual({ ok: false, error: 'Escribí el nombre.' })
    expect(aplicarEdicion(venc, { seccion: 'vencPersonal', texto: 'X', fecha: { anio: 2026, mes: 2, dia: 30 } }, HOY)).toEqual({ ok: false, error: 'Revisá la fecha.' })
    expect(aplicarEdicion(pend, { seccion: 'pendiente', texto: 'x'.repeat(201), fecha: null }, HOY)).toEqual({ ok: false, error: 'La tarea puede tener hasta 200 letras.' })
  })

  it('la fila muestra la sección y lo que se guarda', () => {
    expect(filaPropuesta(venc)).toEqual({ seccion: 'Vencimientos', texto: 'Patente (10 de diciembre de 2026)' })
    expect(filaPropuesta(persona)).toEqual({ seccion: 'Quién se ocupa en Malibú', texto: 'Raúl (Jardinero)' })
  })
})

describe('teléfono para editar', () => {
  it('muestra el número como se escribe', () => {
    expect(telParaEditar('59899123456')).toBe('099 123 456')
    expect(telParaEditar('59829001234')).toBe('2900 1234')
    expect(telParaEditar(undefined)).toBe('')
    expect(telParaEditar('raro')).toBe('raro')
  })
})
