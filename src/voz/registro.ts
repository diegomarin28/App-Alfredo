/**
 * Registro de diagnóstico del dictado (ronda 9, temporal). Cada evento del reconocedor con la hora en milisegundos,
 * para ver qué hace Safari en el iPhone real. Se guarda en sessionStorage: sobrevive a la recarga del plan B.
 */

export interface EventoRegistro {
  /** ms desde 1970 */
  t: number
  /** número del reconocedor (0: el hook, no un reconocedor) */
  n: number
  ev: string
}

const CLAVE = 'alfredo:dictado:registro'
const MAX = 400

let eventos: EventoRegistro[] | null = null
const oyentes = new Set<() => void>()

function cargar(): EventoRegistro[] {
  if (eventos) return eventos
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    const lista: unknown = crudo ? JSON.parse(crudo) : []
    eventos = Array.isArray(lista) ? (lista as EventoRegistro[]) : []
  } catch {
    eventos = []
  }
  return eventos
}

function guardar() {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(eventos))
  } catch {
    /* sin sessionStorage: queda solo en memoria */
  }
}

export function anotar(n: number, ev: string): void {
  const lista = cargar()
  eventos = [...lista, { t: Date.now(), n, ev }].slice(-MAX)
  guardar()
  oyentes.forEach((f) => f())
}

export function suscribirRegistro(f: () => void): () => void {
  oyentes.add(f)
  return () => oyentes.delete(f)
}

const VACIO: EventoRegistro[] = []
export const leerRegistro = (): EventoRegistro[] => (typeof window === 'undefined' ? VACIO : cargar())
export const leerRegistroServidor = (): EventoRegistro[] => VACIO

export function borrarRegistro(): void {
  eventos = []
  guardar()
  oyentes.forEach((f) => f())
}

const dos = (x: number, n = 2) => String(x).padStart(n, '0')
/** 14:20:49.123 (hora del teléfono) */
export const horaMs = (t: number): string => {
  const d = new Date(t)
  return `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}.${dos(d.getMilliseconds(), 3)}`
}

/** El registro como texto para copiar: una línea por evento, con el navegador arriba. */
export function registroComoTexto(lista: EventoRegistro[] = leerRegistro()): string {
  const navegador = typeof navigator === 'undefined' ? '' : navigator.userAgent
  return [`Navegador: ${navegador}`, ...lista.map((e) => `${horaMs(e.t)} ${e.n ? `#${e.n}` : '--'} ${e.ev}`)].join('\n')
}

/** Solo para pruebas. */
export function _reiniciarRegistro(): void {
  eventos = null
}
