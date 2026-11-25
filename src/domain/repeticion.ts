import type { Fecha, Recordatorio, Repeticion } from './tipos'

/** Opciones de "Se repite" (Calendario y Recordatorios), en el orden en que se muestran. */
export const REPETICIONES: readonly (readonly [Repeticion, string])[] = [
  ['nunca', 'No se repite'], ['diaria', 'Todos los días'], ['semanal', 'Todas las semanas'],
  ['mensual', 'Todos los meses'], ['anual', 'Todos los años'],
]

const DIA_MS = 86_400_000

function aUtc(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12))
}
const iso = (d: Date) => d.toISOString().slice(0, 10)
const sumarDias = (fecha: string, dias: number) => iso(new Date(aUtc(fecha).getTime() + dias * DIA_MS))
const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()
const dos = (n: number) => String(n).padStart(2, '0')

/** Días de la semana (1 = lunes … 7 = domingo, como en la base): letra del chip y nombre. */
export const DIAS_SEMANA: readonly (readonly [number, string, string])[] = [
  [1, 'L', 'lunes'], [2, 'M', 'martes'], [3, 'M', 'miércoles'], [4, 'J', 'jueves'],
  [5, 'V', 'viernes'], [6, 'S', 'sábado'], [7, 'D', 'domingo'],
]
const CORTOS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** Día de la semana de una fecha YYYY-MM-DD: 1 = lunes … 7 = domingo. */
export function diaDeSemana(fecha: string): number {
  const d = aUtc(fecha).getUTCDay()
  return d === 0 ? 7 : d
}

/** El primer día marcado desde `desde` (inclusive). */
export function proximoDiaMarcado(dias: readonly number[], desde: string): string {
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(desde, i)
    if (dias.includes(diaDeSemana(f))) return f
  }
  return desde
}

/** "lun, mié y vie"; los siete: "todos los días". */
export function rotuloDiasSemana(dias: readonly number[]): string {
  const orden = [...new Set(dias)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b)
  if (orden.length === 7) return 'todos los días'
  const n = orden.map((d) => CORTOS[d - 1])
  return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`
}

/** Valida los días marcados: al menos uno, del 1 al 7, sin repetir; los devuelve ordenados. */
export function validarDiasSemana(x: unknown): { ok: true; valor: number[] } | { ok: false; error: string } {
  if (!Array.isArray(x) || x.length === 0) return { ok: false, error: 'Elegí al menos un día.' }
  if (!x.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) return { ok: false, error: 'Elegí al menos un día.' }
  return { ok: true, valor: [...new Set(x as number[])].sort((a, b) => a - b) }
}

/** El día `dia` en ese mes; si el mes no lo tiene, el último (31 → 30, 29/2 → 28/2). */
function enElMes(anio: number, mes: number, dia: number): string {
  return `${anio}-${dos(mes)}-${dos(Math.min(dia, diasDelMes(anio, mes)))}`
}

/**
 * Próxima vez (YYYY-MM-DD, desde hoy inclusive) de algo que arranca en `base` y se repite así.
 * Semanal con días marcados: el próximo día marcado desde hoy, incluido hoy.
 * null: no se repite y ya pasó.
 */
export function proximaRepeticion(base: string, rep: Repeticion, hoyStr: string, diasSemana?: readonly number[]): string | null {
  if (rep === 'semanal' && diasSemana?.length) return proximoDiaMarcado(diasSemana, hoyStr)
  if (base >= hoyStr) return base
  const [, m, d] = base.split('-').map(Number)
  const [ha, hm] = hoyStr.split('-').map(Number)
  switch (rep) {
    case 'nunca': return null
    case 'diaria': return hoyStr
    case 'semanal': {
      const atras = Math.round((aUtc(hoyStr).getTime() - aUtc(base).getTime()) / DIA_MS) % 7
      return atras === 0 ? hoyStr : sumarDias(hoyStr, 7 - atras)
    }
    case 'mensual': {
      const esteMes = enElMes(ha, hm, d)
      return esteMes >= hoyStr ? esteMes : enElMes(hm === 12 ? ha + 1 : ha, hm === 12 ? 1 : hm + 1, d)
    }
    case 'anual': {
      const esteAnio = enElMes(ha, m, d)
      return esteAnio >= hoyStr ? esteAnio : enElMes(ha + 1, m, d)
    }
  }
}

export function rotuloRepeticion(rep: Repeticion): string {
  return { nunca: 'una vez', diaria: 'cada día', semanal: 'cada semana', mensual: 'cada mes', anual: 'cada año' }[rep]
}

/** Base de una fecha "MM-DD" con año opcional (sin año: este año, que para "todos los años" da lo mismo). */
function base(dia: string, anio: number | undefined, hoyStr: string): string {
  return `${anio ?? hoyStr.slice(0, 4)}-${dia}`
}

/** Próxima ocurrencia de una fecha del Calendario (el cumpleaños, todos los años). */
export function proximaDeFecha(f: Pick<Fecha, 'tipo' | 'dia' | 'repeticion' | 'anioEvento' | 'diasSemana'>, hoyStr: string): string | null {
  if (f.tipo === 'cumple') return proximaRepeticion(base(f.dia, undefined, hoyStr), 'anual', hoyStr)
  return proximaRepeticion(base(f.dia, f.anioEvento, hoyStr), f.repeticion ?? 'anual', hoyStr, f.diasSemana)
}

/** Próxima ocurrencia de un recordatorio; null si no tiene fecha o ya pasó (y no se repite). */
export function proximaDeRecordatorio(r: Pick<Recordatorio, 'dia' | 'repeticion' | 'anio' | 'diasSemana'>, hoyStr: string): string | null {
  if (r.dia === null) return null
  return proximaRepeticion(base(r.dia, r.anio, hoyStr), r.repeticion ?? 'anual', hoyStr, r.diasSemana)
}

/** Días de aviso de un recordatorio: los semanales avisan el mismo día. */
export function diasDeAviso(r: Pick<Recordatorio, 'avisarDiasAntes' | 'repeticion'>): number {
  return r.repeticion === 'semanal' ? 0 : r.avisarDiasAntes
}

/** Días marcados de algo semanal (los viejos, sin días: el día de la semana de su fecha). */
export function diasMarcados(x: { dia: string | null; anio?: number; diasSemana?: number[] }, hoyStr: string): number[] {
  if (x.diasSemana?.length) return x.diasSemana
  return [diaDeSemana(x.dia ? base(x.dia, x.anio, hoyStr) : hoyStr)]
}

/** "Posponer" por N días desde hoy. */
export function posponerPor(r: Recordatorio, hoyStr: string, dias: number): Recordatorio {
  return { ...r, pospuestoHasta: sumarDias(hoyStr, dias) }
}

/**
 * "Resuelto": los anuales y los de una vez no vuelven en el año de esa ocurrencia; los que se repiten más seguido
 * quedan ocultos hasta el día siguiente a esta ocurrencia (y aparece la próxima).
 */
export function resolverRecordatorio(r: Recordatorio, hoyStr: string): Recordatorio {
  const { pospuestoHasta: _p, ...resto } = r
  const ocurrencia = proximaDeRecordatorio(r, hoyStr) ?? hoyStr
  const rep = r.repeticion ?? 'anual'
  if (rep === 'anual' || rep === 'nunca') return { ...resto, resueltoAnio: Number(ocurrencia.slice(0, 4)) }
  return { ...resto, pospuestoHasta: sumarDias(ocurrencia, 1) }
}
