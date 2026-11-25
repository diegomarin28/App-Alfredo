import { cantidad } from './cantidades'
import type { Recordatorio, Repeticion } from './tipos'
import { posponerPor, proximaDeRecordatorio, validarDiasSemana } from './repeticion'
import { MESES, validarDiaMes } from './validarFecha'

export function chipAviso(dias: number): string {
  if (dias >= 30 && dias % 30 === 0) return `${cantidad(dias / 30, 'mes')} antes`
  if (dias >= 7 && dias % 7 === 0) return `${cantidad(dias / 7, 'semana')} antes`
  return `${cantidad(dias, 'día')} antes`
}

/** "12-25" -> "25 de diciembre"; null -> "Fecha a cargar". */
export function fechaLarga(dia: string | null): string {
  if (dia === null) return 'Fecha a cargar'
  const [m, d] = dia.split('-').map(Number)
  return `${d} de ${MESES[m - 1].toLowerCase()}`
}

export function validarAccion(x: unknown): 'posponer' | 'resolver' | null {
  return x === 'posponer' || x === 'resolver' ? x : null
}

export const MAX_TITULO = 80

export interface EntradaRecordatorio {
  titulo: string; dia: number | null; mes: number | null; avisarDiasAntes: number
  /** falta = todos los años */
  repeticion?: Repeticion
  /** obligatorio si no se repite */
  anio?: number | null
  /** "Posponer" por defecto (días); falta = 15 */
  posponerDias?: number
  /** semanal: días marcados (1 = lunes … 7 = domingo); con días no se piden día, mes ni año y avisa ese mismo día */
  diasSemana?: number[] | null
}
export interface ValorRecordatorio {
  titulo: string; dia: string | null; avisarDiasAntes: number; repeticion: Repeticion; anio?: number; posponerDias: number
  diasSemana?: number[]
}
export type ResultadoRecordatorio = { ok: true; valor: ValorRecordatorio } | { ok: false; error: string }

const REPS: Repeticion[] = ['nunca', 'diaria', 'semanal', 'mensual', 'anual']

/**
 * permitirSinFecha: solo al editar un recordatorio que todavía no tiene fecha (dia null).
 * desde (YYYY-MM-DD): fecha de inicio que guardan los semanales con días marcados (hoy, o la que ya tenían).
 */
export function validarRecordatorio(e: EntradaRecordatorio, permitirSinFecha = false, desde?: string): ResultadoRecordatorio {
  const titulo = typeof e.titulo === 'string' ? e.titulo.trim() : ''
  if (!titulo) return { ok: false, error: 'Escribí el título.' }
  if (titulo.length > MAX_TITULO) return { ok: false, error: `El título puede tener hasta ${MAX_TITULO} letras.` }
  if (e.repeticion === 'semanal' && e.diasSemana != null && desde) {
    const ds = validarDiasSemana(e.diasSemana)
    if (!ds.ok) return ds
    const posponerDias = e.posponerDias ?? 15
    if (!Number.isInteger(posponerDias) || posponerDias < 1 || posponerDias > 365) return { ok: false, error: 'Elegí cuánto posponer.' }
    return {
      ok: true,
      valor: { titulo, dia: desde.slice(5), avisarDiasAntes: 0, repeticion: 'semanal', anio: Number(desde.slice(0, 4)), posponerDias, diasSemana: ds.valor },
    }
  }
  let dia: string | null = null
  if (e.dia === null && e.mes === null) {
    if (!permitirSinFecha) return { ok: false, error: 'Elegí el día y el mes.' }
  } else if (e.dia === null || e.mes === null) {
    return { ok: false, error: 'Elegí el día y el mes.' }
  } else {
    const dm = validarDiaMes(e.dia, e.mes)
    if (!dm.ok) return dm
    dia = dm.valor
  }
  const n = e.avisarDiasAntes
  if (!Number.isInteger(n) || n < 1 || n > 365) return { ok: false, error: 'Los días de aviso tienen que ser entre 1 y 365.' }
  const repeticion = e.repeticion ?? 'anual'
  if (!REPS.includes(repeticion)) return { ok: false, error: 'Elegí si se repite.' }
  const anio = e.anio != null && !Number.isNaN(e.anio) ? e.anio : null
  if (repeticion === 'nunca' && dia !== null && anio === null) return { ok: false, error: 'Elegí el año.' }
  if (anio !== null && (!Number.isInteger(anio) || anio < 1900 || anio > 2200)) return { ok: false, error: 'Revisá el año.' }
  const posponerDias = e.posponerDias ?? 15
  if (!Number.isInteger(posponerDias) || posponerDias < 1 || posponerDias > 365) return { ok: false, error: 'Elegí cuánto posponer.' }
  return { ok: true, valor: { titulo, dia, avisarDiasAntes: n, repeticion, ...(anio !== null ? { anio } : {}), posponerDias } }
}

/** Hasta cuándo posponer: N días desde hoy, o una fecha elegida (que sea después de hoy). */
export function destinoPosponer(p: { dias?: unknown; hasta?: unknown }, hoyStr: string): { ok: true; hasta: string } | { ok: false; error: string } {
  if (typeof p.hasta === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.hasta) || p.hasta <= hoyStr) return { ok: false, error: 'Elegí una fecha después de hoy.' }
    return { ok: true, hasta: p.hasta }
  }
  if (typeof p.dias === 'number' && Number.isInteger(p.dias) && p.dias >= 1 && p.dias <= 365) {
    return { ok: true, hasta: posponerPor({ id: '', titulo: '', dia: null, avisarDiasAntes: 1 }, hoyStr, p.dias).pospuestoHasta! }
  }
  return { ok: false, error: 'Elegí cuánto posponer.' }
}

/** Cambio a guardar al editar: si cambia la fecha o el aviso, se limpia lo resuelto/pospuesto. */
export function cambioEdicion(actual: Recordatorio, v: { titulo: string; dia: string | null; avisarDiasAntes: number } & Partial<ValorRecordatorio>) {
  const cambia = v.dia !== actual.dia || v.avisarDiasAntes !== actual.avisarDiasAntes
    || (v.repeticion ?? 'anual') !== (actual.repeticion ?? 'anual') || (v.anio ?? null) !== (actual.anio ?? null)
    || (v.diasSemana ?? []).join() !== (actual.diasSemana ?? []).join()
  // sin año (no "nunca"): borrar el que tenía; sin días marcados: borrar los que tenía
  const anio = v.repeticion && v.anio === undefined && actual.anio !== undefined ? { anio: null } : {}
  const dias = v.diasSemana === undefined && actual.diasSemana !== undefined ? { diasSemana: null } : {}
  return { ...v, ...anio, ...dias, ...(cambia ? { pospuestoHasta: null, resueltoAnio: null } : {}) }
}

/** Cambio a guardar al resolver: marca el año y borra cualquier posposición vieja. */
export function cambioResolver(resuelto: Recordatorio) {
  return { resueltoAnio: resuelto.resueltoAnio ?? null, pospuestoHasta: resuelto.pospuestoHasta ?? null }
}

/** "Se repiten todos los años": por próxima ocurrencia desde hoy, los sin fecha al final, empate por título. */
export function ordenarAnuales<R extends Pick<Recordatorio, 'titulo' | 'dia' | 'repeticion' | 'anio'>>(rs: R[], hoyStr: string): R[] {
  const clave = (r: R) => proximaDeRecordatorio(r, hoyStr) ?? (r.dia === null ? '9999-99-99' : '9999-99-98')
  return [...rs].sort((a, b) => clave(a).localeCompare(clave(b)) || a.titulo.localeCompare(b.titulo, 'es'))
}
