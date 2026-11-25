/**
 * Fechas dentro de los textos (ronda 7). Nunca se muestra una fecha como 2026-11-30: se lee "lunes 30/11".
 * Si la IA mete la fecha en el texto de una tarea, se saca del texto y va aparte.
 */
import { DIAS_SEMANA, diaDeSemana } from './repeticion'

const ISO_EXACTA = /^(\d{4})-(\d{2})-(\d{2})$/

/** ¿Es una fecha YYYY-MM-DD que existe? */
export function esFechaIso(t: string): boolean {
  const m = ISO_EXACTA.exec(t)
  if (!m) return false
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const f = new Date(Date.UTC(a, mes - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d
}

/** "lunes 30/11". */
export function diaCorto(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${DIAS_SEMANA[diaDeSemana(iso) - 1][2]} ${d}/${m}`
}

const ANTES = '(?<![\\p{L}\\p{N}])'
const SEMANA = '(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)'
const ISO = '(\\d{4}-\\d{2}-\\d{2})(?!\\d)'
/** "el lunes 2026-11-30", "para el 2026-11-30", "2026-11-30" (con la coma o los dos puntos de alrededor). */
const CON_PREVIA = new RegExp(`[\\s,:;-]*${ANTES}(?:(?:para|hasta|desde)\\s+)?(?:el\\s+)?(?:${SEMANA}\\s+)?${ISO}[\\s,:;.-]*`, 'iu')
const LEGIBLE = new RegExp(`${ANTES}(${SEMANA}\\s+)?${ISO}`, 'giu')

const prolijo = (t: string) => {
  const s = t.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/^[\s,.;:-]+|[\s,;:-]+$/g, '').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Saca la primera fecha YYYY-MM-DD (y su "el lunes") del texto: "El lunes 2026-11-30 ir a X" → "Ir a X" + 2026-11-30. */
export function sacarFechaIso(texto: string): { texto: string; fecha: string | null } {
  const m = CON_PREVIA.exec(texto)
  if (!m || !esFechaIso(m[1])) return { texto, fecha: null }
  const antes = texto.slice(0, m.index)
  const despues = texto.slice(m.index + m[0].length)
  const limpio = prolijo(`${antes} ${despues}`)
  return limpio ? { texto: limpio, fecha: m[1] } : { texto, fecha: null }
}

/** Cambia cada 2026-11-30 por "lunes 30/11" (si ya decía "el lunes", no lo repite). */
export function fechasLegibles(texto: string): string {
  return texto.replace(LEGIBLE, (todo, semana: string | undefined, iso: string) => {
    if (!esFechaIso(iso)) return todo
    const corto = diaCorto(iso)
    return semana ? `${semana.trim()} ${corto.slice(corto.indexOf(' ') + 1)}` : corto
  })
}

/** Fecha opcional de un formulario: '' → null; si no es una fecha que existe, error. */
export function fechaOpcional(v: unknown): { ok: true; valor: string | null } | { ok: false; error: string } {
  const t = typeof v === 'string' ? v.trim() : ''
  if (!t) return { ok: true, valor: null }
  return esFechaIso(t) ? { ok: true, valor: t } : { ok: false, error: 'Revisá la fecha.' }
}
