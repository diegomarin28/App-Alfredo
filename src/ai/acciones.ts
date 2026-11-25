/**
 * Acciones de Contame: validar lo que propone la IA, describirlo y editarlo en "Esto es lo que entendí".
 * Puro (sin servidor): lo usan la ruta de la IA, la de guardar y la pantalla de revisión.
 */
import { nombreCasa, validarEventoCasa, validarPersonaCasa, validarServicioCasa } from '@/domain/casas'
import { validarContacto } from '@/domain/contactos'
import { fechaLarga, validarRecordatorio } from '@/domain/recordatorios'
import { limpiarNombreCumple } from '@/domain/nombres'
import { validarFecha } from '@/domain/validarFecha'
import { fechaCompleta, MAX_NOTA, MAX_PENDIENTE, validarNota, validarPendiente, validarVencimiento } from '@/domain/vencimientos'
import type { Casa } from '@/domain/tipos'
import type { Accion } from './contamePrompt'

export type { Accion } from './contamePrompt'

const MMDD = /^(\d{2})-(\d{2})$/

/** Valida una acción con los validadores del dominio. null si no sirve. La salida de la IA no es confiable (R28). */
export function validarAccion(raw: unknown, hoyStr: string): Accion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const s = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '')
  const opc = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined)
  const entero = (k: string, porDefecto: number) => (o[k] === undefined || o[k] === null ? porDefecto : typeof o[k] === 'number' ? (o[k] as number) : NaN)
  switch (o.tipo) {
    case 'eventoCasa': {
      const r = validarEventoCasa({ casa: s('casa'), que: s('que'), cuando: s('cuando') }, hoyStr)
      return r.ok ? { tipo: 'eventoCasa', ...r.valor } : null
    }
    case 'personaCasa': {
      const r = validarPersonaCasa({ casa: s('casa'), nombre: s('nombre'), rol: s('rol'), detalle: opc('detalle'), telefono: opc('telefono') })
      return r.ok ? { tipo: 'personaCasa', ...r.valor } : null
    }
    case 'servicioCasa': {
      // sin el número: se guarda igual y queda en "Para completar"
      const r = validarServicioCasa({ casa: s('casa'), clave: s('clave'), valor: s('valor') }, { sinValor: true })
      return r.ok ? { tipo: 'servicioCasa', ...r.valor } : null
    }
    case 'pendiente': {
      const r = validarPendiente(s('texto'))
      return r.ok ? { tipo: 'pendiente', texto: r.valor } : null
    }
    case 'nota': {
      const r = validarNota(s('texto'))
      return r.ok ? { tipo: 'nota', texto: r.valor } : null
    }
    case 'contacto': {
      // Sin grupo: los grupos los arma Alfredo en Contactos.
      const r = validarContacto({ nombre: s('nombre'), empresa: opc('empresa'), telefono: opc('telefono'), nota: opc('nota') })
      if (!r.ok) return null
      return { tipo: 'contacto', ...r.valor }
    }
    case 'fecha': {
      const anio = o.anioNacimiento === undefined || o.anioNacimiento === null ? null : entero('anioNacimiento', NaN)
      // cumpleaños sin fecha: se guarda igual y queda en "Para completar" (no aparece en el Calendario)
      const cumple = s('tipoFecha') === 'cumple'
      const sinFecha = cumple && !s('dia').trim()
      const m = sinFecha ? ['', '01', '01'] : MMDD.exec(s('dia'))
      if (!m) return null
      // ronda 6: la relación no va pegada al nombre ("Juan", no "Juan (hijo)")
      const nombre = cumple ? limpiarNombreCumple(s('nombre')) : s('nombre')
      const r = validarFecha({ nombre, tipo: s('tipoFecha'), dia: Number(m[2]), mes: Number(m[1]), anio }, Number(hoyStr.slice(0, 4)))
      if (!r.ok || (anio !== null && r.valor.anioNacimiento === undefined)) return null
      const { tipo, ...resto } = r.valor
      return { tipo: 'fecha', tipoFecha: tipo, ...resto, ...(sinFecha ? { dia: null } : {}) }
    }
    case 'recordatorio': {
      const m = MMDD.exec(s('dia'))
      if (!m) return null
      const r = validarRecordatorio({ titulo: s('titulo'), dia: Number(m[2]), mes: Number(m[1]), avisarDiasAntes: entero('avisarDiasAntes', 30) })
      if (!r.ok || r.valor.dia === null) return null
      return { tipo: 'recordatorio', titulo: r.valor.titulo, dia: r.valor.dia, avisarDiasAntes: r.valor.avisarDiasAntes }
    }
    case 'vencimiento': {
      const r = validarVencimiento({ titulo: s('titulo'), ambito: s('ambito'), fecha: s('fecha'), avisarDiasAntes: entero('avisarDiasAntes', 7) })
      if (!r.ok) return null
      const { titulo, ambito, fecha, avisarDiasAntes } = r.valor
      return { tipo: 'vencimiento', titulo, ambito, fecha, avisarDiasAntes }
    }
    default:
      return null
  }
}

/** Texto legible de una acción inválida, para mostrarla en "No entendí". */
const CAMPOS_LEGIBLES = ['que', 'texto', 'titulo', 'nombre', 'rol', 'clave', 'valor', 'empresa', 'detalle', 'telefono', 'nota', 'casa', 'cuando', 'fecha', 'dia', 'ambito']
export function textoLegible(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim()
  if (!raw || typeof raw !== 'object') return ''
  const o = raw as Record<string, unknown>
  return CAMPOS_LEGIBLES.map((k) => o[k]).filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim()).join(' · ')
}

/** Texto entero como tarea (si entra y no se pide nota) o como nota(s). */
export function textoLibre(texto: string, comoNota = false): Accion[] {
  const t = texto.trim()
  if (!t) return []
  if (t.length <= MAX_PENDIENTE && !comoNota) return [{ tipo: 'pendiente', texto: t }]
  const notas: Accion[] = []
  let resto = t
  while (resto.length > MAX_NOTA) {
    const corte = resto.lastIndexOf(' ', MAX_NOTA)
    const i = corte > MAX_NOTA / 2 ? corte : MAX_NOTA
    notas.push({ tipo: 'nota', texto: resto.slice(0, i).trim() })
    resto = resto.slice(i).trim()
  }
  if (resto) notas.push({ tipo: 'nota', texto: resto })
  return notas
}

const recortar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t)
const NOMBRE_FECHA = { cumple: 'cumpleaños', otra: 'fecha' } as const

export function describir(a: Accion): string {
  switch (a.tipo) {
    case 'eventoCasa': return `Historial de ${nombreCasa(a.casa)}: ${recortar(a.que, 120)} (${fechaLarga(a.cuando.slice(5))})`
    case 'personaCasa': return `Quién se ocupa en ${nombreCasa(a.casa)}: ${a.nombre} (${a.rol})`
    case 'servicioCasa': return `Servicios de ${nombreCasa(a.casa)}: ${a.clave}, ${a.valor ? recortar(a.valor, 80) : 'falta el número'}`
    case 'pendiente': return `Tareas pendientes: ${a.texto}`
    case 'nota': return `Notas: ${recortar(a.texto, 120)}`
    case 'contacto': return `Contactos: ${a.nombre}${a.empresa ? ` (${a.empresa})` : ''}`
    case 'fecha': return `Calendario: ${NOMBRE_FECHA[a.tipoFecha]} de ${a.nombre} (${a.dia ? fechaLarga(a.dia) : 'falta la fecha'})`
    case 'recordatorio': return `Recordatorios: ${a.titulo} (${fechaLarga(a.dia)})`
    case 'vencimiento': return `Vencimientos: ${a.titulo} (${fechaCompleta(a.fecha)})`
  }
}

// ---------- revisión: "Esto es lo que entendí" ----------

/** A qué sección va cada fila (lo que se elige en "Va en"). */
export type SeccionContame =
  | 'pendiente' | 'nota' | 'cumple' | 'otra' | 'recordatorio' | 'vencEmpresa' | 'vencPersonal' | 'contacto'
  | 'eventoPortofino' | 'eventoMalibu' | 'personaPortofino' | 'personaMalibu' | 'servicioPortofino' | 'servicioMalibu'

export const SECCIONES_CONTAME: [SeccionContame, string][] = [
  ['pendiente', 'Tareas pendientes'],
  ['nota', 'Notas'],
  ['cumple', 'Calendario · cumpleaños'],
  ['otra', 'Calendario · otra fecha'],
  ['recordatorio', 'Recordatorios'],
  ['vencEmpresa', 'Vencimientos · empresa'],
  ['vencPersonal', 'Vencimientos · personal'],
  ['contacto', 'Contactos'],
  ['eventoPortofino', 'Historial de Portofino'],
  ['eventoMalibu', 'Historial de Malibú'],
  ['personaPortofino', 'Quién se ocupa en Portofino'],
  ['personaMalibu', 'Quién se ocupa en Malibú'],
  ['servicioPortofino', 'Servicios de Portofino'],
  ['servicioMalibu', 'Servicios de Malibú'],
]

const deCasa = (base: 'evento' | 'persona' | 'servicio', c: Casa) => `${base}${c === 'malibu' ? 'Malibu' : 'Portofino'}` as SeccionContame
const casaDe = (s: SeccionContame): Casa => (s.endsWith('Malibu') ? 'malibu' : 'portofino')

export function seccionDe(a: Accion): SeccionContame {
  switch (a.tipo) {
    case 'eventoCasa': return deCasa('evento', a.casa)
    case 'personaCasa': return deCasa('persona', a.casa)
    case 'servicioCasa': return deCasa('servicio', a.casa)
    case 'fecha': return a.tipoFecha
    case 'vencimiento': return a.ambito === 'empresa' ? 'vencEmpresa' : 'vencPersonal'
    default: return a.tipo
  }
}

/** Qué fecha pide la sección: completa (día, mes y año), día y mes, día y mes opcional, o ninguna. */
export function fechaQuePide(s: SeccionContame): 'completa' | 'diaMes' | 'diaMesOpcional' | null {
  if (s === 'vencEmpresa' || s === 'vencPersonal' || s.startsWith('evento')) return 'completa'
  if (s === 'otra' || s === 'recordatorio') return 'diaMes'
  if (s === 'cumple') return 'diaMesOpcional'
  return null
}

/** Cómo se llama el texto principal en cada sección. */
export function etiquetaTexto(s: SeccionContame): string {
  if (s === 'pendiente') return 'Qué hay que hacer'
  if (s === 'nota') return 'Nota'
  if (s.startsWith('evento')) return 'Qué pasó'
  if (s.startsWith('servicio')) return 'Servicio'
  if (s === 'recordatorio') return 'Qué hay que gestionar'
  if (s === 'vencEmpresa' || s === 'vencPersonal') return 'Qué vence'
  return 'Nombre'
}

export interface FechaEdicion { anio: number; mes: number; dia: number }
export interface Edicion {
  seccion: SeccionContame
  texto: string
  fecha: FechaEdicion | null
  /** solo "Quién se ocupa": qué hace */
  rol?: string
  /** solo Servicios: el número o dato */
  valor?: string
}

function textoPrincipal(a: Accion): string {
  switch (a.tipo) {
    case 'eventoCasa': return a.que
    case 'personaCasa': case 'contacto': case 'fecha': return a.nombre
    case 'servicioCasa': return a.clave
    case 'pendiente': case 'nota': return a.texto
    case 'recordatorio': case 'vencimiento': return a.titulo
  }
}

const deIso = (iso: string): FechaEdicion => { const [anio, mes, dia] = iso.split('-').map(Number); return { anio, mes, dia } }
const deMmdd = (mmdd: string, hoyStr: string): FechaEdicion => { const [mes, dia] = mmdd.split('-').map(Number); return { anio: Number(hoyStr.slice(0, 4)), mes, dia } }

/** Lo que muestra la hoja de edición de una fila. */
export function edicionDe(a: Accion, hoyStr: string): Edicion {
  const fecha = a.tipo === 'eventoCasa' ? deIso(a.cuando)
    : a.tipo === 'vencimiento' ? deIso(a.fecha)
      : a.tipo === 'recordatorio' ? deMmdd(a.dia, hoyStr)
        : a.tipo === 'fecha' && a.dia ? deMmdd(a.dia, hoyStr)
          : null
  return {
    seccion: seccionDe(a), texto: textoPrincipal(a), fecha,
    ...(a.tipo === 'personaCasa' ? { rol: a.rol } : {}),
    ...(a.tipo === 'servicioCasa' ? { valor: a.valor ?? '' } : {}),
  }
}

const dos = (n: number) => String(n).padStart(2, '0')

function fechaReal(f: FechaEdicion): boolean {
  const d = new Date(Date.UTC(f.anio, f.mes - 1, f.dia))
  return d.getUTCFullYear() === f.anio && d.getUTCMonth() === f.mes - 1 && d.getUTCDate() === f.dia
}

/**
 * Aplica lo editado (texto, fecha y sección) a una fila. Lo demás que tenía (teléfono, empresa, aviso…) se
 * conserva si la sección nueva lo usa. Valida con las mismas reglas que al guardar.
 */
export function aplicarEdicion(a: Accion, e: Edicion, hoyStr: string): { ok: true; accion: Accion } | { ok: false; error: string } {
  const texto = e.texto.trim()
  if (!texto) return { ok: false, error: `Escribí ${etiquetaTexto(e.seccion) === 'Nombre' ? 'el nombre' : 'el texto'}.` }
  const pide = fechaQuePide(e.seccion)
  const f = e.fecha
  if (pide && pide !== 'diaMesOpcional' && !f) return { ok: false, error: pide === 'completa' ? 'Elegí la fecha.' : 'Elegí el día y el mes.' }
  if (f && pide && !fechaReal(pide === 'completa' ? f : { ...f, anio: 2000 })) return { ok: false, error: 'Revisá la fecha.' }
  const iso = f ? `${f.anio}-${dos(f.mes)}-${dos(f.dia)}` : ''
  const mmdd = f ? `${dos(f.mes)}-${dos(f.dia)}` : ''
  const v = a as Record<string, unknown>
  const de = <T,>(k: string) => (v[k] as T | undefined)

  let raw: Record<string, unknown>
  switch (e.seccion) {
    case 'pendiente': raw = { tipo: 'pendiente', texto }; break
    case 'nota': raw = { tipo: 'nota', texto }; break
    case 'cumple': raw = { tipo: 'fecha', tipoFecha: 'cumple', nombre: texto, dia: mmdd, ...(a.tipo === 'fecha' ? { anioNacimiento: a.anioNacimiento } : {}) }; break
    case 'otra': raw = { tipo: 'fecha', tipoFecha: 'otra', nombre: texto, dia: mmdd }; break
    case 'recordatorio': raw = { tipo: 'recordatorio', titulo: texto, dia: mmdd, avisarDiasAntes: a.tipo === 'recordatorio' ? a.avisarDiasAntes : 30 }; break
    case 'vencEmpresa': case 'vencPersonal':
      raw = { tipo: 'vencimiento', titulo: texto, ambito: e.seccion === 'vencEmpresa' ? 'empresa' : 'personal', fecha: iso, avisarDiasAntes: a.tipo === 'vencimiento' ? a.avisarDiasAntes : 7 }
      break
    case 'contacto': raw = { tipo: 'contacto', nombre: texto, empresa: de('empresa'), telefono: de('telefono'), nota: de('nota') }; break
    case 'eventoPortofino': case 'eventoMalibu': raw = { tipo: 'eventoCasa', casa: casaDe(e.seccion), que: texto, cuando: iso }; break
    case 'personaPortofino': case 'personaMalibu': {
      const rol = (e.rol ?? '').trim()
      if (!rol) return { ok: false, error: 'Escribí qué hace.' }
      raw = { tipo: 'personaCasa', casa: casaDe(e.seccion), nombre: texto, rol, detalle: de('detalle'), telefono: de('telefono') }
      break
    }
    case 'servicioPortofino': case 'servicioMalibu': raw = { tipo: 'servicioCasa', casa: casaDe(e.seccion), clave: texto, valor: (e.valor ?? '').trim() }; break
  }
  const accion = validarAccion(raw, hoyStr)
  if (!accion) {
    if (e.seccion === 'pendiente' && texto.length > MAX_PENDIENTE) return { ok: false, error: `La tarea puede tener hasta ${MAX_PENDIENTE} letras.` }
    return { ok: false, error: 'Revisá los datos.' }
  }
  return { ok: true, accion }
}

/** Fila de la revisión: a qué sección va y qué se guarda. */
export function filaPropuesta(a: Accion): { seccion: string; texto: string } {
  const d = describir(a)
  const i = d.indexOf(': ')
  const texto = d.slice(i + 2)
  return { seccion: d.slice(0, i), texto: texto.charAt(0).toUpperCase() + texto.slice(1) }
}
