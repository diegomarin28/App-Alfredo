import { hoyMontevideo } from './fechas'
import type { Vencimiento } from './tipos'
import { MESES } from './validarFecha'

export const MAX_TITULO_VENCIMIENTO = 80
export const MAX_PENDIENTE = 200
export const MAX_NOTA = 5000

function partes(fecha: string): [number, number, number] {
  const [a, m, d] = fecha.split('-').map(Number)
  return [a, m, d]
}

/** "2026-12-12" -> "12 de diciembre de 2026". */
export function fechaCompleta(fecha: string): string {
  const [a, m, d] = partes(fecha)
  return `${d} de ${MESES[m - 1].toLowerCase()} de ${a}`
}

/** Timestamp ISO -> "22 de noviembre" (día de Montevideo). */
export function fechaCorta(iso: string): string {
  const [, m, d] = partes(hoyMontevideo(new Date(iso)))
  return `${d} de ${MESES[m - 1].toLowerCase()}`
}

export function chipVencimiento(dias: number): string {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias > 1) return `En ${dias} días`
  return dias === -1 ? 'Venció hace 1 día' : `Venció hace ${-dias} días`
}

export interface EntradaVencimiento { titulo: string; ambito: string; fecha: string; avisarDiasAntes: number }
export type ResultadoVencimiento =
  | { ok: true; valor: Omit<Vencimiento, 'id' | 'loteId' | 'creadoEn'> }
  | { ok: false; error: string }

function fechaValida(f: unknown): f is string {
  if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return false
  const [a, m, d] = partes(f)
  const x = new Date(Date.UTC(a, m - 1, d))
  return x.getUTCFullYear() === a && x.getUTCMonth() === m - 1 && x.getUTCDate() === d
}

export function validarVencimiento(e: EntradaVencimiento): ResultadoVencimiento {
  const titulo = typeof e.titulo === 'string' ? e.titulo.trim() : ''
  if (!titulo) return { ok: false, error: 'Escribí el título.' }
  if (titulo.length > MAX_TITULO_VENCIMIENTO) return { ok: false, error: `El título puede tener hasta ${MAX_TITULO_VENCIMIENTO} letras.` }
  if (e.ambito !== 'empresa' && e.ambito !== 'personal') return { ok: false, error: 'Elegí si es de la empresa o personal.' }
  if (!fechaValida(e.fecha)) return { ok: false, error: 'Elegí una fecha válida.' }
  const n = e.avisarDiasAntes
  if (!Number.isInteger(n) || n < 1 || n > 365) return { ok: false, error: 'Los días de aviso tienen que ser entre 1 y 365.' }
  return { ok: true, valor: { titulo, ambito: e.ambito, fecha: e.fecha, avisarDiasAntes: n, hecho: false } }
}

type ResTexto = { ok: true; valor: string } | { ok: false; error: string }

function validarTexto(t: unknown, max: number, vacio: string, largo: string): ResTexto {
  const s = typeof t === 'string' ? t.trim() : ''
  if (!s) return { ok: false, error: vacio }
  if (s.length > max) return { ok: false, error: largo }
  return { ok: true, valor: s }
}

export const validarPendiente = (t: string): ResTexto =>
  validarTexto(t, MAX_PENDIENTE, 'Escribí el pendiente.', `El pendiente puede tener hasta ${MAX_PENDIENTE} letras.`)

export const validarNota = (t: string): ResTexto =>
  validarTexto(t, MAX_NOTA, 'Escribí la nota.', `La nota puede tener hasta ${MAX_NOTA} letras.`)
