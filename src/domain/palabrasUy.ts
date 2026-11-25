/**
 * Palabras de Uruguay bien escritas (ronda 8). El dictado del iPhone escribe "Canelones" de mil formas
 * ("Can Ahillones", "can-agilones", "cana jones"). Ronda 9: en vez de una lista de errores fijos, cada palabra o
 * grupo de 2 o 3 palabras se compara por cómo suena (fonetica.ts) contra estos lugares y los nombres de la familia.
 * A la IA, además, se le pasa la lista para que corrija lo que suene parecido.
 */
import { distancia, fonetica, tolerancia } from './fonetica'

export const DEPARTAMENTOS = [
  'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 'Maldonado',
  'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres',
]

export const CIUDADES_Y_BARRIOS = [
  'Montevideo', 'Carrasco', 'Pocitos', 'Punta Carretas', 'Ciudad Vieja', 'Punta del Este', 'La Barra', 'Manantiales',
  'José Ignacio', 'Maldonado', 'Piriápolis', 'Colonia', 'Salto', 'Paysandú',
]

export const CASAS = ['Portofino', 'Malibú']

/** Organismos y empresas que el dictado escribe mal. */
export const SIGLAS = ['UTE', 'OSE', 'BPS', 'DGI', 'BROU']
export const ORGANISMOS = ['Antel', 'Intendencia']

/** Todo junto, sin repetir: es la lista que recibe la IA. */
export const PALABRAS_UY = [...new Set([...DEPARTAMENTOS, ...CIUDADES_Y_BARRIOS, ...CASAS, ...SIGLAS, ...ORGANISMOS])]

/**
 * También son palabras comunes ("un salto", "las flores", "treinta y tres", "la ribera", "la barra"): tienen que sonar
 * igual, no se les cambia la mayúscula, y solo se arreglan si el dictado las partió ("Inten dencia") o les sacó el
 * tilde manteniendo las mayúsculas ("San Jose", "Rio Negro").
 */
const COMUNES = new Set([
  'Colonia', 'Durazno', 'Flores', 'Florida', 'Rivera', 'Rocha', 'Salto', 'Artigas', 'Soriano', 'Cerro Largo',
  'Río Negro', 'San José', 'Treinta y Tres', 'Ciudad Vieja', 'La Barra', 'Intendencia',
])

/** Se corrigen por sonido, pero escritas tal cual en minúscula son otra cosa ("comí canelones", "los manantiales"). */
const MINUSCULA_VALIDA = new Set(['Canelones', 'Manantiales'])

/** Palabras cortas que no se comen dentro de un lugar ("a Maldonado" no es "Maldonado" entero). */
const FUNCION = new Set([
  'a', 'al', 'de', 'del', 'el', 'la', 'las', 'lo', 'los', 'en', 'y', 'e', 'o', 'u', 'con', 'por', 'para', 'que', 'se',
  'mi', 'su', 'tu', 'un', 'una', 'es', 'me', 'te', 'le', 'les', 'ya', 'hoy',
])

interface Objetivo {
  bien: string
  fon: string
  /** cuántas palabras tiene bien escrito */
  palabras: string[]
  comun: boolean
  /** se acepta que suene parecido (no solo igual) */
  difuso: boolean
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '')
const llano = (t: string) => sinTildes(t.toLowerCase())

function objetivo(bien: string, difuso: boolean): Objetivo {
  const comun = COMUNES.has(bien)
  return { bien, fon: fonetica(bien), palabras: llano(bien).split(/\s+/), comun, difuso: difuso && !comun }
}

const LUGARES: Objetivo[] = [...new Set([...ORGANISMOS, ...DEPARTAMENTOS, ...CIUDADES_Y_BARRIOS, ...CASAS])].map((b) => objetivo(b, true))

const unaLetra = (c: string) => `[${c.toLowerCase()}${c}]`
/** Sigla con puntos: "U.T.E." → "UTE" (el último punto es de la sigla). */
const siglaConPuntos = (s: string) => [...s].map(unaLetra).join('\\.\\s?') + '\\.'
/**
 * Sigla deletreada en mayúsculas ("U T E") o escrita como una palabra ("Ute", "bps") → "UTE". Deletreada en
 * minúscula no: "trabaja o se ocupa" no es OSE.
 */
const sigla = (s: string) => `(?:${[...s].join('\\s?')}|${[...s].map(unaLetra).join('')})`
const ANTES = '(?<![\\p{L}\\p{N}])'
const DESPUES = '(?![\\p{L}\\p{N}])'

/** Mismas letras y mayúsculas, solo cambian los tildes. */
const soloTildes = (escrito: string, bien: string) => escrito !== bien && sinTildes(escrito) === sinTildes(bien)

interface Token { texto: string; inicio: number; fin: number }

/** ¿Se puede corregir `escrito` (k palabras, a distancia d) por este objetivo? */
function sePuede(escrito: string, tokens: Token[], o: Objetivo, d: number): boolean {
  const junto = escrito.replace(/[\s-]+/g, ' ')
  if (o.comun) {
    if (d !== 0) return false
    return tokens.length > o.palabras.length || soloTildes(junto, o.bien)
  }
  if (MINUSCULA_VALIDA.has(o.bien) && junto === junto.toLowerCase() && llano(junto) === llano(o.bien)) return false
  // una palabra corta de más en una punta ("a Maldonado", "Maldonado y"): si sin ella suena igual o mejor, no va
  for (const [punta, resto, suya] of [
    [tokens[0], tokens.slice(1), o.palabras[0]],
    [tokens[tokens.length - 1], tokens.slice(0, -1), o.palabras[o.palabras.length - 1]],
  ] as const) {
    if (tokens.length < 2) break
    const p = llano(punta.texto)
    if (!FUNCION.has(p) || p === suya) continue
    if (distancia(fonetica(resto.map((t) => t.texto).join('')), o.fon) <= d) return false
  }
  return true
}

/** Busca, palabra por palabra, grupos de 1 a 3 palabras que suenen como un objetivo, y los escribe bien. */
function corregirPorSonido(texto: string, objetivos: Objetivo[]): string {
  const tokens: Token[] = [...texto.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({ texto: m[0], inicio: m.index, fin: m.index + m[0].length }))
  let salida = ''
  let hasta = 0
  for (let i = 0; i < tokens.length; ) {
    let mejor: { k: number; d: number; o: Objetivo } | null = null
    for (let k = 1; k <= 3 && i + k - 1 < tokens.length; k++) {
      const grupo = tokens.slice(i, i + k)
      const ultimo = grupo[k - 1]
      if (!/^\p{L}+$/u.test(ultimo.texto)) break // números y códigos no se tocan
      if (k > 1 && !/^[\s-]+$/.test(texto.slice(grupo[k - 2].fin, ultimo.inicio))) break // ni a través de puntuación
      const escrito = texto.slice(grupo[0].inicio, ultimo.fin)
      const f = fonetica(escrito)
      if (!f) continue
      for (const o of objetivos) {
        const tol = o.difuso ? tolerancia(o.fon.length) : 0
        if (f[0] !== o.fon[0] || Math.abs(f.length - o.fon.length) > tol) continue
        const d = distancia(f, o.fon)
        if (d > tol + 1e-9 || !sePuede(escrito, grupo, o, d)) continue
        if (!mejor || d < mejor.d || (d === mejor.d && k > mejor.k)) mejor = { k, d, o }
      }
    }
    if (!mejor) {
      i++
      continue
    }
    const inicio = tokens[i].inicio
    const fin = tokens[i + mejor.k - 1].fin
    salida += texto.slice(hasta, inicio) + mejor.o.bien
    hasta = fin
    i += mejor.k
  }
  return salida + texto.slice(hasta)
}

/**
 * Corrige lugares, casas y organismos de Uruguay que el dictado escribe mal, y los nombres que se le pasen
 * (la familia: tienen que sonar igual, "Alvaro" → "Álvaro", "Jerique" → "Gericke").
 */
export function corregirPalabrasUy(texto: string, nombres: string[] = []): string {
  let t = texto
  for (const s of SIGLAS) {
    t = t.replace(new RegExp(`${ANTES}${siglaConPuntos(s)}`, 'gu'), s)
    // "ose" en minúscula puede ser el verbo ("que ose"): ese solo si viene deletreado o con mayúscula
    t = t.replace(new RegExp(`${ANTES}${sigla(s)}${DESPUES}`, 'gu'), (m) => (s === 'OSE' && m === 'ose' ? m : s))
  }
  const familia = nombres.filter((n) => fonetica(n)).map((n) => objetivo(n, false))
  return corregirPorSonido(t, [...LUGARES, ...familia])
}
