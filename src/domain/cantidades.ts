/**
 * Cantidades con la palabra en singular o plural (ronda 6): "1 año", "2 años", "1 día", "1 tarea pendiente".
 * Todo texto con un número delante pasa por acá.
 */

const PLURALES: Record<string, string> = {
  año: 'años',
  día: 'días',
  semana: 'semanas',
  mes: 'meses',
  tarea: 'tareas',
  'tarea pendiente': 'tareas pendientes',
  foto: 'fotos',
  documento: 'documentos',
  cargada: 'cargadas',
  cargado: 'cargados',
}

/** "1 año" / "3 años"; con otra palabra, pasale el plural. */
export function cantidad(n: number, singular: string, plural = PLURALES[singular] ?? `${singular}s`): string {
  return `${n} ${n === 1 || n === -1 ? singular : plural}`
}

/** "cumple 1 año", "cumple 80 años"; sin edad (o 0), nada. */
export function textoEdad(edad: number | null | undefined): string {
  return edad != null && edad > 0 ? `cumple ${cantidad(edad, 'año')}` : ''
}

/** "Hoy", "Mañana", "En 3 días", "Venció ayer", "Venció hace 2 días". */
export function enDias(n: number, { ayer = true } = {}): string {
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  if (n > 1) return `En ${cantidad(n, 'día')}`
  if (n === -1 && ayer) return 'Venció ayer'
  return `Venció hace ${cantidad(-n, 'día')}`
}
