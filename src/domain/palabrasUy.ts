/**
 * Palabras de Uruguay bien escritas (ronda 8). El dictado del iPhone escribe "Can Ahillones" por "Canelones" o
 * "Maldo nado" por "Maldonado". Antes de ordenar con la IA, el texto pasa por estas correcciones; a la IA, además,
 * se le pasa la lista para que corrija lo que suene parecido.
 */

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
 * También son palabras comunes ("un salto", "las flores", "treinta y tres", "la barra"): no se les cambia la
 * mayúscula; solo se arreglan si el dictado las partió ("Inten dencia") o les sacó el tilde manteniendo las
 * mayúsculas ("San Jose", "Rio Negro").
 */
const COMUNES = new Set([
  'Colonia', 'Durazno', 'Flores', 'Florida', 'Rivera', 'Rocha', 'Salto', 'Artigas', 'Soriano', 'Cerro Largo',
  'Río Negro', 'San José', 'Treinta y Tres', 'Ciudad Vieja', 'La Barra', 'Intendencia',
])

/** Lo que el dictado escribe y no se parece letra a letra (se compara sin mayúsculas ni tildes). */
const OIDAS: { mal: string; bien: string }[] = [
  { mal: 'Can Ahillones', bien: 'Canelones' },
  { mal: 'Can Ayones', bien: 'Canelones' },
  { mal: 'Canellones', bien: 'Canelones' },
  { mal: 'Antell', bien: 'Antel' },
  { mal: 'Pirápolis', bien: 'Piriápolis' },
  { mal: 'Punta Carreta', bien: 'Punta Carretas' },
  { mal: 'Puntas Carretas', bien: 'Punta Carretas' },
  { mal: 'Punta de Este', bien: 'Punta del Este' },
]

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '')
const TILDES: Record<string, string> = { a: '[aá]', e: '[eé]', i: '[ií]', o: '[oó]', u: '[uúü]' }
/** Una letra con o sin tilde, en mayúscula o minúscula (la regex va con /i). */
const letra = (c: string) => TILDES[sinTildes(c).toLowerCase()] ?? escapar(c)
/** Límite de palabra que entiende acentos (\b de JS es solo ASCII). */
const ANTES = '(?<![\\p{L}\\p{N}])'
const DESPUES = '(?![\\p{L}\\p{N}])'

/** La frase con o sin tildes y con cualquier espacio entre palabras. */
const frase = (t: string) => t.split(/\s+/).map((p) => [...p].map(letra).join('')).join('\\s+')

/** Una palabra partida por el dictado: hasta dos espacios adentro ("Maldo nado", "Pay san dú"). */
const partida = (t: string) => [...t].map(letra).join('(?:\\s)?')

const unaLetra = (c: string) => `[${c.toLowerCase()}${c}]`
/** Sigla con puntos: "U.T.E." → "UTE" (el último punto es de la sigla). */
const siglaConPuntos = (s: string) => [...s].map(unaLetra).join('\\.\\s?') + '\\.'
/** Sigla deletreada o escrita como palabra: "U T E", "Ute" → "UTE". */
const sigla = (s: string) => [...s].map(unaLetra).join('\\s?')

/** Mismas letras y mayúsculas, solo cambian los tildes. */
const soloTildes = (escrito: string, bien: string) => escrito !== bien && sinTildes(escrito) === sinTildes(bien)

/** Corrige lugares, casas y organismos de Uruguay que el dictado escribe mal. */
export function corregirPalabrasUy(texto: string): string {
  let t = texto
  for (const o of OIDAS) t = t.replace(new RegExp(`${ANTES}${frase(o.mal)}${DESPUES}`, 'giu'), o.bien)

  for (const s of SIGLAS) {
    t = t.replace(new RegExp(`${ANTES}${siglaConPuntos(s)}`, 'gu'), s)
    // "ose" en minúscula puede ser el verbo ("que ose"): ese solo si viene deletreado o con mayúscula
    t = t.replace(new RegExp(`${ANTES}${sigla(s)}${DESPUES}`, 'gu'), (m) => (s === 'OSE' && m === 'ose' ? m : s))
  }

  for (const bien of [...ORGANISMOS, ...DEPARTAMENTOS, ...CIUDADES_Y_BARRIOS, ...CASAS]) {
    const comun = COMUNES.has(bien)
    if (bien.includes(' ')) {
      t = t.replace(new RegExp(`${ANTES}${frase(bien)}${DESPUES}`, 'giu'), (m) => {
        const escrito = m.replace(/\s+/g, ' ')
        if (!comun) return bien
        return soloTildes(escrito, bien) ? bien : m
      })
      continue
    }
    t = t.replace(new RegExp(`${ANTES}${partida(bien)}${DESPUES}`, 'giu'), (m) => {
      const pedazos = m.split(/\s/)
      if (pedazos.length > 1) return pedazos.every((p) => p.length >= 2) ? bien : m
      if (!comun) return bien
      return soloTildes(m, bien) ? bien : m
    })
  }
  return t
}
