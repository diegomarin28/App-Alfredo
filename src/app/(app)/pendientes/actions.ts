'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarNota, validarPendiente } from '@/domain/vencimientos'

type Res = { ok: true } | { ok: false; error: string }

async function permitido(): Promise<Res> {
  try {
    await requerirRol('owner') // R20
    return { ok: true }
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
}

function refrescar() {
  revalidatePath('/pendientes')
  revalidatePath('/')
}

export async function agregarPendiente(texto: string): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const v = validarPendiente(texto)
  if (!v.ok) return v
  await (await getRepo()).pendientes.create({ texto: v.valor, hecho: false })
  refrescar()
  return { ok: true }
}

export async function tildarPendiente(id: string, hecho: boolean): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  if (typeof id !== 'string' || typeof hecho !== 'boolean') return { ok: false, error: 'Pedido inválido.' }
  const repo = await getRepo()
  if (!(await repo.pendientes.get(id))) return { ok: false, error: 'No existe ese pendiente.' }
  await repo.pendientes.update(id, { hecho })
  refrescar()
  return { ok: true }
}

export async function guardarNota(texto: string): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const v = validarNota(texto)
  if (!v.ok) return v
  await (await getRepo()).notas.create({ texto: v.valor, origen: 'escrita' })
  refrescar()
  return { ok: true }
}
