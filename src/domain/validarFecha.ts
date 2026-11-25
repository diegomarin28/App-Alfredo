import type { Fecha, Repeticion } from './tipos'
import { validarDiasSemana } from './repeticion'

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] // febrero con 29: el 29/2 se permite

export interface EntradaFecha {
  nombre: string
  tipo: string
  dia: number
  mes: number
  /** cumpleaños: año de nacimiento (opcional); otra: año de la fecha (obligatorio si no se repite) */
  anio?: number | null
  /** solo "otra" (falta = todos los años) */
  repeticion?: Repeticion
  /** HH:MM, opcional (solo "otra") */
  hora?: string | null
  /** solo "otra" semanal: días marcados (1 = lunes … 7 = domingo); con días no se piden día, mes ni año */
  diasSemana?: number[] | null
}
export type ResultadoFecha =
  | { ok: true; valor: Omit<Fecha, 'id' | 'loteId' | 'creadoEn'> }
  | { ok: false; error: string }

const REPS: Repeticion[] = ['nunca', 'diaria', 'semanal', 'mensual', 'anual']

/** Valida día + mes (29/2 permitido) y devuelve "MM-DD". Compartida por fechas y recordatorios. */
export function validarDiaMes(dia: number, mes: number): { ok: true; valor: string } | { ok: false; error: string } {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return { ok: false, error: 'Elegí el mes.' }
  if (!Number.isInteger(dia) || dia < 1) return { ok: false, error: 'Elegí el día.' }
  if (dia > DIAS_MES[mes - 1]) return { ok: false, error: `${MESES[mes - 1]} no tiene ${dia} días.` }
  return { ok: true, valor: `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` }
}

/**
 * hoyStr (YYYY-MM-DD): para las semanales con días marcados, que guardan hoy como fecha de inicio.
 */
export function validarFecha(e: EntradaFecha, anioActual: number, hoyStr = `${anioActual}-01-01`): ResultadoFecha {
  const nombre = (e.nombre ?? '').trim()
  if (!nombre) return { ok: false, error: 'Escribí el nombre.' }
  if (e.tipo !== 'cumple' && e.tipo !== 'otra') return { ok: false, error: 'Elegí qué tipo de fecha es.' }
  if (e.tipo === 'otra' && e.repeticion === 'semanal' && e.diasSemana != null) {
    const ds = validarDiasSemana(e.diasSemana)
    if (!ds.ok) return ds
    const hora = (e.hora ?? '').trim()
    if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { ok: false, error: 'Revisá la hora.' }
    return {
      ok: true,
      valor: { nombre, tipo: 'otra', dia: hoyStr.slice(5), repeticion: 'semanal', anioEvento: Number(hoyStr.slice(0, 4)), diasSemana: ds.valor, ...(hora ? { hora } : {}) },
    }
  }
  const dm = validarDiaMes(e.dia, e.mes)
  if (!dm.ok) return dm
  const dia = dm.valor
  const anio = e.anio != null && !Number.isNaN(e.anio) ? e.anio : null
  if (e.tipo === 'cumple') {
    if (anio === null) return { ok: true, valor: { nombre, tipo: 'cumple', dia } }
    if (!Number.isInteger(anio) || anio < 1900 || anio > anioActual) return { ok: false, error: `El año tiene que estar entre 1900 y ${anioActual}.` }
    return { ok: true, valor: { nombre, tipo: 'cumple', dia, anioNacimiento: anio } }
  }
  const repeticion = e.repeticion ?? 'anual'
  if (!REPS.includes(repeticion)) return { ok: false, error: 'Elegí si se repite.' }
  if (anio === null && repeticion === 'nunca') return { ok: false, error: 'Elegí el año.' }
  if (anio !== null) {
    if (!Number.isInteger(anio) || anio < 1900 || anio > anioActual + 50) return { ok: false, error: `El año tiene que estar entre 1900 y ${anioActual + 50}.` }
    const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
    if (dia === '02-29' && !bisiesto && repeticion === 'nunca') return { ok: false, error: `Febrero de ${anio} no tiene 29 días.` }
  }
  const hora = (e.hora ?? '').trim()
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return { ok: false, error: 'Revisá la hora.' }
  return {
    ok: true,
    valor: { nombre, tipo: 'otra', dia, repeticion, ...(anio !== null ? { anioEvento: anio } : {}), ...(hora ? { hora } : {}) },
  }
}
