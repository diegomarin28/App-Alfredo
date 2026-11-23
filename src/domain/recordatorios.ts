import type { Recordatorio } from './tipos'
import { MESES, validarDiaMes } from './validarFecha'

export function chipAviso(dias: number): string {
  if (dias === 7) return '1 semana antes'
  if (dias === 30) return '1 mes antes'
  if (dias === 60) return '2 meses antes'
  return dias === 1 ? '1 día antes' : `${dias} días antes`
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

export interface EntradaRecordatorio { titulo: string; dia: number | null; mes: number | null; avisarDiasAntes: number }
export type ResultadoRecordatorio =
  | { ok: true; valor: { titulo: string; dia: string | null; avisarDiasAntes: number } }
  | { ok: false; error: string }

/** permitirSinFecha: solo al editar un recordatorio que todavía no tiene fecha (dia null). */
export function validarRecordatorio(e: EntradaRecordatorio, permitirSinFecha = false): ResultadoRecordatorio {
  const titulo = typeof e.titulo === 'string' ? e.titulo.trim() : ''
  if (!titulo) return { ok: false, error: 'Escribí el título.' }
  if (titulo.length > MAX_TITULO) return { ok: false, error: `El título puede tener hasta ${MAX_TITULO} letras.` }
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
  return { ok: true, valor: { titulo, dia, avisarDiasAntes: n } }
}

/** Cambio a guardar al editar: si cambia la fecha o el aviso, se limpia lo resuelto/pospuesto. */
export function cambioEdicion(actual: Recordatorio, v: { titulo: string; dia: string | null; avisarDiasAntes: number }) {
  const cambia = v.dia !== actual.dia || v.avisarDiasAntes !== actual.avisarDiasAntes
  return { ...v, ...(cambia ? { pospuestoHasta: null, resueltoAnio: null } : {}) }
}

/** Cambio a guardar al resolver: marca el año y borra cualquier posposición vieja. */
export function cambioResolver(resuelto: Recordatorio) {
  return { resueltoAnio: resuelto.resueltoAnio, pospuestoHasta: null }
}
