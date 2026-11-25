/**
 * Nombres bien escritos (ronda 6). El dictado del iPhone cambia apellidos: dice "Henrique" por "Gericke".
 * Antes de ordenar con la IA, el texto pasa por este diccionario fijo; a la IA, además, se le pasa la lista de
 * nombres que ya hay en Calendario, Contactos y Casas.
 */

const APELLIDO = 'Gericke'

/** Nombres de pila de la familia (además, cualquiera que esté guardado como "… Gericke"). */
export const FAMILIA = ['Alfredo', 'Pau', 'Paula', 'Paulina', 'María', 'Santiago', 'Álvaro', 'Ignacio', 'Alfonso', 'Eugenia']

interface Correccion {
  /** palabra que escribe mal el dictado */
  mal: string
  bien: string
  /** solo si va después de un nombre de la familia ("Pau Enrique" → "Pau Gericke"; "Enrique" solo es un nombre) */
  despuesDeFamilia?: boolean
}

export const CORRECCIONES: Correccion[] = [
  { mal: 'Henrique', bien: APELLIDO },
  { mal: 'Enrique', bien: APELLIDO, despuesDeFamilia: true },
]

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const TILDES: Record<string, string> = { a: '[aá]', e: '[eé]', i: '[ií]', o: '[oó]', u: '[uúü]', á: '[aá]', é: '[eé]', í: '[ií]', ó: '[oó]', ú: '[uú]' }
/** Un nombre con o sin tildes: el dictado a veces escribe "Alvaro" o "Maria". */
const conOSinTildes = (n: string) => [...escapar(n)].map((c) => TILDES[c.toLowerCase()] ?? c).join('')
/** Límite de palabra que entiende acentos (\b de JS es solo ASCII). */
const ANTES = '(?<![\\p{L}\\p{N}])'
const DESPUES = '(?![\\p{L}\\p{N}])'

/** Nombres de pila de la familia: los fijos y el primero de cada nombre guardado con el apellido. */
export function nombresFamilia(conocidos: string[] = []): string[] {
  const deLaLista = conocidos
    .map((n) => n.trim().split(/\s+/))
    .filter((p) => p.length > 1 && p[p.length - 1].toLowerCase() === APELLIDO.toLowerCase())
    .map((p) => p[0])
  return [...new Set([...FAMILIA, ...deLaLista])]
}

/** Aplica el diccionario fijo. `conocidos`: nombres guardados (suman nombres de la familia). */
export function corregirNombres(texto: string, conocidos: string[] = []): string {
  const familia = nombresFamilia(conocidos).map(conOSinTildes).join('|')
  let t = texto
  for (const c of CORRECCIONES) {
    const mal = escapar(c.mal)
    t = c.despuesDeFamilia
      ? t.replace(new RegExp(`${ANTES}(${familia})(\\s+)${mal}${DESPUES}`, 'giu'), (_m, nombre: string, esp: string) => `${nombre}${esp}${c.bien}`)
      : t.replace(new RegExp(`${ANTES}${mal}${DESPUES}`, 'giu'), c.bien)
  }
  return t
}

const RELACIONES = [
  'hijo', 'hija', 'nieto', 'nieta', 'bisnieto', 'bisnieta', 'hermano', 'hermana', 'sobrino', 'sobrina', 'primo', 'prima',
  'yerno', 'nuera', 'esposa', 'esposo', 'mujer', 'marido', 'cuñado', 'cuñada', 'tío', 'tía', 'tio', 'tia', 'padre', 'madre',
  'papá', 'mamá', 'suegro', 'suegra', 'amigo', 'amiga', 'ahijado', 'ahijada', 'novio', 'novia', 'pareja', 'socio', 'socia',
]
const REL = RELACIONES.map(escapar).join('|')
const POSESIVO = '(?:mi|mis|su|sus|el|la|nuestro|nuestra)'

/**
 * El nombre de un cumpleaños sin la relación: "Juan (hijo)", "mi hijo Juan", "Juan, mi hijo" → "Juan".
 * Si no queda nada, devuelve el nombre como vino.
 */
export function limpiarNombreCumple(nombre: string): string {
  const limpio = nombre
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(new RegExp(`^\\s*(?:${POSESIVO}\\s+)?(?:${REL})${DESPUES}\\s*,?\\s*`, 'iu'), '')
    .replace(new RegExp(`\\s*,?\\s+(?:${POSESIVO}\\s+)?(?:${REL})\\s*$`, 'iu'), '')
    .replace(/\s+/g, ' ')
    .trim()
  return limpio || nombre.trim()
}
