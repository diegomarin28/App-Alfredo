/** "Avisarme con" (Recordatorios y Vencimientos): opciones fijas y "Otro" con N días, semanas o meses. */
export const OPCIONES_AVISO = [
  { clave: 'dia', texto: '1 día', dias: 1 },
  { clave: 'tres', texto: '3 días', dias: 3 },
  { clave: 'semana', texto: '1 semana', dias: 7 },
  { clave: 'mes', texto: '1 mes', dias: 30 },
  { clave: 'meses', texto: '2 meses', dias: 60 },
] as const

export const UNIDADES_AVISO = [['dias', 'días'], ['semanas', 'semanas'], ['meses', 'meses']] as const
export type UnidadAviso = (typeof UNIDADES_AVISO)[number][0]
const POR_UNIDAD: Record<UnidadAviso, number> = { dias: 1, semanas: 7, meses: 30 }

export function claveAviso(dias: number): string {
  return OPCIONES_AVISO.find((o) => o.dias === dias)?.clave ?? 'otro'
}

/** Días de aviso según la opción; "otro": N en la unidad elegida. */
export function diasAviso(aviso: string, otro: string, unidad: UnidadAviso = 'dias'): number {
  if (aviso === 'otro') return Number(otro) * POR_UNIDAD[unidad]
  return OPCIONES_AVISO.find((o) => o.clave === aviso)!.dias
}

/** Al editar un "Otro": la unidad más natural para mostrar esos días (14 → 2 semanas, 90 → 3 meses). */
export function otroDesdeDias(dias: number): { otro: string; unidad: UnidadAviso } {
  if (dias % 30 === 0) return { otro: String(dias / 30), unidad: 'meses' }
  if (dias % 7 === 0) return { otro: String(dias / 7), unidad: 'semanas' }
  return { otro: String(dias), unidad: 'dias' }
}
