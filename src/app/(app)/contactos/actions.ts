'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarContacto, validarGrupo, type EntradaContacto } from '@/domain/contactos'

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

export async function agregarContacto(entrada: EntradaContacto): Promise<Res> {
  const sin = await soloOwner()
  if (sin) return sin
  const r = validarContacto(entrada)
  if (!r.ok) return r
  const repo = getRepo()
  if (r.valor.grupoId && !(await repo.gruposContacto.get(r.valor.grupoId))) return { ok: false, error: 'Ese grupo ya no existe.' }
  await repo.contactos.create(r.valor)
  revalidatePath('/contactos')
  return { ok: true }
}

/** "+ Grupo": crea un grupo con el nombre que elija Alfredo; va al final de los filtros. */
export async function crearGrupo(nombre: string): Promise<Res> {
  const sin = await soloOwner()
  if (sin) return sin
  const repo = getRepo()
  const grupos = await repo.gruposContacto.list()
  const r = validarGrupo(nombre, grupos.map((g) => g.nombre))
  if (!r.ok) return r
  await repo.gruposContacto.create({ nombre: r.valor, orden: Math.max(0, ...grupos.map((g) => g.orden)) + 1 })
  revalidatePath('/contactos')
  return { ok: true }
}
