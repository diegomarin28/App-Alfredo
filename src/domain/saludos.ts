export type Tono = 'calido' | 'formal' | 'corto'

export function saludos(nombre: string): Record<Tono, string> {
  return {
    calido: `¡Feliz cumple, ${nombre}! Que lo pases bárbaro. Un abrazo grande.`,
    formal: `Muy feliz cumpleaños, ${nombre}. Te deseo un gran año, con salud y alegría.`,
    corto: `¡Feliz cumple, ${nombre}! Que se cumplan todos tus deseos.`,
  }
}
