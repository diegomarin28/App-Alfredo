'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { hoy } from '@/domain/fechas'
import { validarId } from '@/domain/ids'
import { validarFecha, type EntradaFecha } from '@/domain/validarFecha'

type Res = { ok: true } | { ok: false; error: string }

async function permitido(): Promise<Res> {
  try {
    await requerirRol('owner', 'familia') // R20
    return { ok: true }
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
}

export async function agregarFecha(entrada: EntradaFecha): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const r = validarFecha(entrada, Number(hoy().slice(0, 4)))
  if (!r.ok) return r
  await (await getRepo()).fechas.create(r.valor)
  revalidatePath('/calendario')
  revalidatePath('/')
  return { ok: true }
}

export async function borrarFecha(id: string): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const repo = getRepo()
  if (!validarId(id) || !(await repo.fechas.get(id))) return { ok: false, error: 'Esa fecha ya no está.' }
  await repo.fechas.remove(id)
  revalidatePath('/calendario')
  revalidatePath('/')
  return { ok: true }
}
