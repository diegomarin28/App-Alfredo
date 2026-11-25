/**
 * Muletillas, correcciones y frases sueltas del dictado (ronda 6): no se guardan, ni como tarea ni como nota.
 * "hay una vez", "perdón", "eh", "vamos a crearlo"…
 */

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Frases enteras que no dicen nada. */
const FRASES = new Set([
  'hay una vez', 'vamos a crearlo', 'vamos a crear', 'vamos a crearla', 'vamos a ver', 'a ver', 'o sea', 'es decir',
  'no se', 'no se que', 'eso es todo', 'nada mas', 'me equivoque', 'no perdon', 'perdon', 'disculpa', 'digo', 'bueno',
  'listo', 'dale', 'ok', 'okay', 'gracias', 'hola', 'probando', 'probando probando', 'uno dos tres', 'como era',
  'que mas', 'y que mas', 'nada', 'eso', 'ya esta', 'borra eso', 'borralo', 'espera',
])

/** Palabras de relleno: un texto hecho solo de estas se descarta. */
const RELLENO = new Set([
  'eh', 'ehh', 'eeh', 'em', 'emm', 'mm', 'mmm', 'hm', 'hmm', 'ah', 'ahh', 'ay', 'uh', 'este', 'bueno', 'perdon', 'pues',
  'o', 'sea', 'y', 'digo', 'entonces', 'ok', 'dale', 'si', 'no', 'che',
])

/** Sonidos que se pueden sacar del principio sin cambiar el sentido ("eh, comprar pilas"). */
const SONIDOS = /^(?:(?:eh+|e+h|em+|m{2,}|hm+|ah+|uh)[\s,.;:!?…-]+)+/iu

/** true si el texto es solo muletillas o una frase suelta: no se guarda. */
export function esMuletilla(texto: string): boolean {
  const n = normalizar(texto)
  if (!n) return true
  if (FRASES.has(n)) return true
  return n.split(' ').every((p) => RELLENO.has(p))
}

/** Saca los sonidos de relleno del principio ("Eh, comprar pilas" → "Comprar pilas"). */
export function sinMuletillas(texto: string): string {
  const original = texto.trim()
  const t = original.replace(SONIDOS, '').trim()
  if (t === original || !t) return original
  return t.charAt(0).toUpperCase() + t.slice(1)
}
