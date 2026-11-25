/**
 * Comparar palabras por cómo suenan en castellano del Uruguay (ronda 9). El dictado escribe "Canelones" de mil formas
 * ("Can Ahillones", "can-agilones", "cana jones"): en vez de una lista de errores, se compara el sonido.
 */

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '')

/**
 * Forma fonética: minúsculas, sin tildes, sin espacios ni guiones, sin h; ll/y/j/g suave suenan igual (y),
 * v/b igual (b), z/s/c suave igual (s), qu/c fuerte/k igual (k). Además "iy"/"yi" es una sola y, y las letras
 * dobles cuentan una vez ("rr", "cc").
 */
export function fonetica(texto: string): string {
  let t = sinTildes(texto.toLowerCase()).replace(/[^a-zñ]/g, '')
  t = t
    .replace(/ch/g, 'C') // la ch es su propio sonido: que la h no se borre
    .replace(/qu/g, 'k')
    .replace(/gu(?=[ei])/g, 'G') // guerra, guiso: g fuerte
    .replace(/g(?=[ei])/g, 'y') // gente, Gericke: g suave
    .replace(/g/g, 'G')
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/ll/g, 'y')
    .replace(/j/g, 'y')
    .replace(/v/g, 'b')
    .replace(/w/g, 'u')
    .replace(/x/g, 'ks')
    .replace(/h/g, '')
    .replace(/C/g, 'ch')
    .replace(/G/g, 'g')
  // letras dobles una vez, después "iy"/"yi" → "y" (otra vez dobles por si quedó "yy")
  t = t.replace(/(.)\1+/g, '$1').replace(/iy|yi/g, 'y').replace(/(.)\1+/g, '$1')
  return t
}

const VOCALES = new Set(['a', 'e', 'i', 'o', 'u'])

/** Distancia de edición; cambiar una vocal por otra cuesta la mitad (el dictado confunde más las vocales). */
export function distancia(a: string, b: string): number {
  if (a === b) return 0
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const fila = [i]
    for (let j = 1; j <= b.length; j++) {
      const x = a[i - 1]
      const y = b[j - 1]
      const cambio = x === y ? 0 : VOCALES.has(x) && VOCALES.has(y) ? 0.5 : 1
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + cambio)
    }
    previa = fila
  }
  return previa[b.length]
}

/**
 * Cuánta diferencia se acepta para una palabra de este largo (fonético). Las cortas tienen que sonar igual
 * ("antes" no es "Antel"); las de 7 u 8, un cambio ("paginando" no es "Paysandú"); las largas, un 20 %
 * ("kanayones" ↔ "kanelones" = 1,5 de 9).
 */
export const tolerancia = (largo: number): number => (largo <= 6 ? 0 : largo <= 8 ? 1 : largo * 0.2)
