/** Detalles personales de la app (mockup v2, ronda 3). */

const TZ = 'America/Montevideo'

/** Cumpleaños de Alfredo (MM-DD): ese día la app brinda con él. */
export const CUMPLE_ALFREDO = '11-25'

export function esCumpleDeAlfredo(hoyStr: string): boolean {
  return hoyStr.slice(5) === CUMPLE_ALFREDO
}

/** Saludo de Inicio según la hora de Montevideo; el viernes desde las 18 h, "Buen viernes". */
export function saludoDelMomento(ahora: Date): string {
  const partes = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(ahora)
  const h = Number(partes.find((p) => p.type === 'hour')!.value)
  const dia = partes.find((p) => p.type === 'weekday')!.value
  if (dia === 'Fri' && h >= 18) return 'Buen viernes'
  if (h >= 5 && h < 12) return 'Buen día'
  if (h >= 12 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Pendientes tildados en el día (para la Flor del truco). Se guarda en el teléfono. */
export interface CuentaDelDia { dia: string; tildados: number; flor: boolean }

/** Suma un pendiente tildado hoy; si la cuenta era de otro día, arranca de nuevo. */
export function contarTildado(antes: CuentaDelDia | null, hoyStr: string): CuentaDelDia {
  if (!antes || antes.dia !== hoyStr) return { dia: hoyStr, tildados: 1, flor: false }
  return { ...antes, tildados: antes.tildados + 1 }
}

/** ¡Flor!: el tercer pendiente resuelto del día, una vez por día. */
export function tocaFlor(c: CuentaDelDia): boolean {
  return c.tildados === 3 && !c.flor
}
