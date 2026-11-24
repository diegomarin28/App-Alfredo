/** Tonos del saludo de cumpleaños (mockup v2): Formal por defecto, nunca juvenil. */
export const TONOS = [['formal', 'Formal'], ['cercano', 'Cercano'], ['breve', 'Breve']] as const
export type Tono = (typeof TONOS)[number][0]

/** Saludos listos para mandar a `nombre`, firmados por `firma` (quien usa la app). */
export function saludos(nombre: string, firma: string): Record<Tono, string> {
  return {
    formal: `${nombre}, te deseo un muy feliz cumpleaños. Que tengas un lindo día junto a los tuyos. Un fuerte abrazo, ${firma}.`,
    cercano: `¡Feliz cumpleaños, ${nombre}! Que pases un lindo día con los tuyos. Un abrazo grande, ${firma}.`,
    breve: `¡Feliz cumpleaños, ${nombre}! Un abrazo, ${firma}.`,
  }
}
