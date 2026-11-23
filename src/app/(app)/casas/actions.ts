'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { hoy } from '@/domain/fechas'
import {
  validarEventoCasa, validarPersonaCasa, validarServicioCasa,
  type EntradaEventoCasa, type EntradaPersonaCasa, type EntradaServicioCasa,
} from '@/domain/casas'
import { validarId } from '@/domain/ids'

type Res = { ok: true } | { ok: false; error: string }

async function permitir(): Promise<Res | null> {
  try {
    await requerirRol('owner', 'familia') // R20
    return null
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
}

export async function agregarPersona(entrada: EntradaPersonaCasa): Promise<Res> {
  const no = await permitir()
  if (no) return no
  const r = validarPersonaCasa(entrada)
  if (!r.ok) return r
  await (await getRepo()).personasCasa.create(r.valor)
  revalidatePath('/casas')
  return { ok: true }
}

export async function agregarEvento(entrada: EntradaEventoCasa): Promise<Res> {
  const no = await permitir()
  if (no) return no
  const r = validarEventoCasa(entrada, hoy())
  if (!r.ok) return r
  await (await getRepo()).eventosCasa.create(r.valor)
  revalidatePath('/casas')
  return { ok: true }
}

export async function agregarServicio(entrada: EntradaServicioCasa): Promise<Res> {
  const no = await permitir()
  if (no) return no
  const r = validarServicioCasa(entrada)
  if (!r.ok) return r
  await (await getRepo()).serviciosCasa.create(r.valor)
  revalidatePath('/casas')
  return { ok: true }
}

async function borrar(tabla: 'personasCasa' | 'eventosCasa' | 'serviciosCasa', id: string, noEsta: string): Promise<Res> {
  const no = await permitir()
  if (no) return no
  const t = getRepo()[tabla]
  if (!validarId(id) || !(await t.get(id))) return { ok: false, error: noEsta }
  await t.remove(id)
  revalidatePath('/casas')
  return { ok: true }
}

export async function borrarPersona(id: string): Promise<Res> {
  return borrar('personasCasa', id, 'Esa persona ya no está.')
}

export async function borrarEvento(id: string): Promise<Res> {
  return borrar('eventosCasa', id, 'Eso del historial ya no está.')
}

export async function borrarServicio(id: string): Promise<Res> {
  return borrar('serviciosCasa', id, 'Ese servicio ya no está.')
}
