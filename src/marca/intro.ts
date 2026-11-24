/**
 * Intro de AlfredIA (mockup v2, ronda 4b: CargaGolf / CargaPadel): cada cuadro es un cuerpo sin cabeza (390×480) con
 * la cabeza de Alfredo encima, en la posición de docs/brand/splash/posiciones_cabeza.json.
 */

/** Del JSON: x (centro), chin (mentón), h (alto de la cara) y rot (grados), en px del cuadro de 390×480. */
const POSICIONES = {
  golf1: { x: 186.75, chin: 89.25, h: 67.5, rot: 0 },
  golf2: { x: 215.25, chin: 120.75, h: 63.75, rot: 4 },
  golf3: { x: 160.5, chin: 88.5, h: 67.5, rot: 14 },
  golf4: { x: 181.5, chin: 91.5, h: 60.0, rot: -6 },
  padel1: { x: 214.5, chin: 111.75, h: 72.75, rot: -4 },
  padel2: { x: 186.0, chin: 101.25, h: 66.75, rot: 10 },
  padel3: { x: 209.25, chin: 90.0, h: 63.75, rot: -4 },
} as const

export type Cuadro = keyof typeof POSICIONES

/** cabeza.png mide 115×179 y el mentón está en y = 148. */
const CABEZA = { ancho: 115, alto: 179, menton: 148 }
export const ORIGEN_MENTON = `50% ${((CABEZA.menton / CABEZA.alto) * 100).toFixed(1)}%`

/** Caja de la cabeza: ancho = 115·h·1,34/148; el mentón de la imagen va en chin − 0,06·h. */
export function cajaCabeza(c: Cuadro) {
  const p = POSICIONES[c]
  const ancho = (CABEZA.ancho * p.h * 1.34) / CABEZA.menton
  const alto = (ancho * CABEZA.alto) / CABEZA.ancho
  const menton = p.chin - 0.06 * p.h
  return {
    left: +(p.x - ancho / 2).toFixed(1),
    top: +(menton - (alto * CABEZA.menton) / CABEZA.alto).toFixed(1),
    width: +ancho.toFixed(1),
    height: +alto.toFixed(1),
    rot: p.rot,
  }
}

/** Escenas: cuadros y cuándo arranca cada uno (fracción de la duración). */
export const ESCENAS = {
  golf: { duracionMs: 3000, cuadros: [['golf1', 0], ['golf2', 0.32], ['golf3', 0.5], ['golf4', 0.56]] },
  padel: { duracionMs: 2400, cuadros: [['padel1', 0], ['padel2', 0.42], ['padel3', 0.54]] },
} as const satisfies Record<string, { duracionMs: number; cuadros: readonly (readonly [Cuadro, number])[] }>

export type Escena = keyof typeof ESCENAS

/** Cuánto queda la intro en pantalla (~2,5 s) antes del fundido. */
export const INTRO_MS = 2500
