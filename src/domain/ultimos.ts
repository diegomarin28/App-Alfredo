import type { Repo } from '@/data/repo'
import { nombreCasa } from './casas'
import { MESES } from './validarFecha'

/** Una fila de "Lo último que guardé" (Contame, mockup v2). */
export interface Guardado {
  id: string
  titulo: string
  detalle: string
  /** para elegir ícono y color */
  clase: 'casa' | 'vencimiento' | 'pendiente' | 'nota' | 'contacto' | 'fecha' | 'recordatorio'
  creadoEn: string
}

const corto = (t: string, n = 60) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t)
const diaMes = (mmdd: string) => { const [m, d] = mmdd.split('-').map(Number); return `${d} ${MESES[m - 1].slice(0, 3).toLowerCase()}` }

/** Lo último que guardó Contame (lo que tiene loteId), de lo más nuevo a lo más viejo. */
export async function ultimosGuardados(repo: Repo, cuantos = 3): Promise<Guardado[]> {
  const [eventos, personas, servicios, pendientes, notas, vencimientos, contactos, fechas, recordatorios] = await Promise.all([
    repo.eventosCasa.list(), repo.personasCasa.list(), repo.serviciosCasa.list(), repo.pendientes.list(), repo.notas.list(),
    repo.vencimientos.list(), repo.contactos.list(), repo.fechas.list(), repo.recordatorios.list(),
  ])
  const de = <T extends { id: string; loteId?: string; creadoEn?: string }>(filas: T[], f: (x: T) => Omit<Guardado, 'id' | 'creadoEn'>) =>
    filas.filter((x) => x.loteId).map((x) => ({ id: x.id, creadoEn: x.creadoEn ?? '', ...f(x) }))
  return [
    ...de(eventos, (e) => ({ titulo: corto(e.que), detalle: `${nombreCasa(e.casa)} · historial`, clase: 'casa' })),
    ...de(personas, (p) => ({ titulo: p.nombre, detalle: `${nombreCasa(p.casa)} · quién se ocupa`, clase: 'casa' })),
    ...de(servicios, (s) => ({ titulo: s.clave, detalle: `${nombreCasa(s.casa)} · servicios`, clase: 'casa' })),
    ...de(pendientes, (p) => ({ titulo: corto(p.texto), detalle: 'Tareas pendientes', clase: 'pendiente' })),
    ...de(notas, (n) => ({ titulo: corto(n.texto), detalle: 'Notas', clase: 'nota' })),
    ...de(vencimientos, (v) => ({ titulo: v.titulo, detalle: `Vencimientos · ${diaMes(v.fecha.slice(5))}`, clase: 'vencimiento' })),
    ...de(contactos, (c) => ({ titulo: c.nombre, detalle: 'Contactos', clase: 'contacto' })),
    ...de(fechas, (f) => ({ titulo: f.nombre, detalle: `Calendario · ${f.dia ? diaMes(f.dia) : 'falta la fecha'}`, clase: 'fecha' })),
    ...de(recordatorios, (r) => ({ titulo: r.titulo, detalle: 'Recordatorios', clase: 'recordatorio' })),
  ].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).slice(0, cuantos)
}
