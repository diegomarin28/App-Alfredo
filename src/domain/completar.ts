import type { Casa, Contacto, Fecha, ServicioCasa } from './tipos'

/** Tipos de ítem que pueden quedar incompletos. */
export type TipoCompletar = 'fecha' | 'servicio' | 'contacto'

export interface ItemCompletar {
  tipo: TipoCompletar
  id: string
  /** "Cumple de Ariel Luz", "Prosegur", "Anabel" */
  titulo: string
  /** "falta la fecha", "falta el número", "falta el teléfono" */
  falta: string
  /** solo servicios: de qué casa es */
  casa?: Casa
}

/** Cuántos se ven en Inicio antes de "Ver todo". */
export const VISIBLES_COMPLETAR = 3

const vacio = (t: string | null | undefined) => !t || !t.trim()
const porNombre = (a: { titulo: string }, b: { titulo: string }) => a.titulo.localeCompare(b.titulo, 'es')

/**
 * "Para completar" (ronda 5, punto 9): lo que quedó a medias y no se omitió. Primero los cumpleaños sin fecha,
 * después los servicios de las casas sin número y al final los contactos sin teléfono; cada grupo por nombre.
 */
export function paraCompletar(d: {
  fechas: Fecha[]
  servicios: ServicioCasa[]
  contactos: Contacto[]
}): ItemCompletar[] {
  const fechas = d.fechas
    .filter((f) => f.tipo === 'cumple' && f.dia === null && !f.completarOmitido)
    .map((f): ItemCompletar => ({ tipo: 'fecha', id: f.id, titulo: `Cumple de ${f.nombre}`, falta: 'falta la fecha' }))
  const servicios = d.servicios
    .filter((s) => vacio(s.valor) && !s.completarOmitido)
    .map((s): ItemCompletar => ({ tipo: 'servicio', id: s.id, titulo: s.clave, falta: 'falta el número', casa: s.casa }))
  const contactos = d.contactos
    .filter((c) => vacio(c.telefono) && !c.completarOmitido)
    .map((c): ItemCompletar => ({ tipo: 'contacto', id: c.id, titulo: c.nombre, falta: 'falta el teléfono' }))
  return [...fechas.sort(porNombre), ...servicios.sort(porNombre), ...contactos.sort(porNombre)]
}

export function esTipoCompletar(x: unknown): x is TipoCompletar {
  return x === 'fecha' || x === 'servicio' || x === 'contacto'
}
