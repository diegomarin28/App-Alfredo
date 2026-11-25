'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { esTipoCompletar } from '@/domain/completar'
import { validarContacto, type EntradaContacto } from '@/domain/contactos'
import { validarServicioCasa } from '@/domain/casas'
import { hoy } from '@/domain/fechas'
import { validarId } from '@/domain/ids'
import { validarFecha } from '@/domain/validarFecha'

/** "Para completar" de Inicio (ronda 5, punto 9): completar o "Omitir" un ítem a medias. Solo Alfredo. */

type Res = { ok: true } | { ok: false; error: string }

async function soloOwner(): Promise<Res | null> {
  try {
    await requerirRol('owner') // R20
    return null
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
}

const YA_NO_ESTA = { ok: false, error: 'Eso ya no está.' } as const

function refrescar(...rutas: string[]) {
  for (const r of ['/', ...rutas]) revalidatePath(r)
}

/** "Omitir": lo saca de la lista para siempre, sin borrar el ítem. */
export async function omitirCompletar(tipo: string, id: string): Promise<Res> {
  const sin = await soloOwner()
  if (sin) return sin
  if (!esTipoCompletar(tipo) || !validarId(id)) return YA_NO_ESTA
  const repo = getRepo()
  const tabla = { fecha: repo.fechas, servicio: repo.serviciosCasa, contacto: repo.contactos }[tipo]
  if (!(await tabla.get(id))) return YA_NO_ESTA
  await tabla.update(id, { completarOmitido: true })
  refrescar()
  return { ok: true }
}

/** Cumpleaños sin fecha: nombre, día, mes y año de nacimiento opcional. */
export async function completarCumple(id: string, e: { nombre: string; dia: number; mes: number; anio: number | null }): Promise<Res> {
  const sin = await soloOwner()
  if (sin) return sin
  const repo = getRepo()
  const actual = validarId(id) ? await repo.fechas.get(id) : null
  if (!actual) return YA_NO_ESTA
  const r = validarFecha({ nombre: e.nombre, tipo: 'cumple', dia: e.dia, mes: e.mes, anio: e.anio }, Number(hoy().slice(0, 4)))
  if (!r.ok) return r
  await repo.fechas.update(id, { nombre: r.valor.nombre, dia: r.valor.dia, anioNacimiento: r.valor.anioNacimiento ?? null })
  refrescar('/calendario')
  return { ok: true }
}

/** Servicio de una casa: nombre y dato (el número). */
export async function editarServicio(id: string, e: { clave: string; valor: string }): Promise<Res> {
  const sin = await soloOwner()
  if (sin) return sin
  const repo = getRepo()
  const actual = validarId(id) ? await repo.serviciosCasa.get(id) : null
  if (!actual) return YA_NO_ESTA
  const r = validarServicioCasa({ casa: actual.casa, clave: e.clave, valor: e.valor })
  if (!r.ok) return r
  await repo.serviciosCasa.update(id, { clave: r.valor.clave, valor: r.valor.valor })
  refrescar('/casas')
  return { ok: true }
}

/** Contacto: todos sus datos (lo que se deja vacío se borra). */
export async function editarContacto(id: string, e: EntradaContacto): Promise<Res> {
  const sin = await soloOwner()
  if (sin) return sin
  const repo = getRepo()
  const actual = validarId(id) ? await repo.contactos.get(id) : null
  if (!actual) return YA_NO_ESTA
  const r = validarContacto(e)
  if (!r.ok) return r
  if (r.valor.grupoId && !(await repo.gruposContacto.get(r.valor.grupoId))) return { ok: false, error: 'Ese grupo ya no existe.' }
  const v = r.valor
  await repo.contactos.update(id, {
    nombre: v.nombre, grupoId: v.grupoId ?? null, empresa: v.empresa ?? null, telefono: v.telefono ?? null, nota: v.nota ?? null,
  })
  refrescar('/contactos')
  return { ok: true }
}
