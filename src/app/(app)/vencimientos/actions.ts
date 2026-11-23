'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarVencimiento, type EntradaVencimiento } from '@/domain/vencimientos'

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
  revalidatePath('/vencimientos')
  revalidatePath('/')
}

export async function agregarVencimiento(entrada: EntradaVencimiento): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const r = validarVencimiento(entrada)
  if (!r.ok) return r
  await (await getRepo()).vencimientos.create(r.valor)
  refrescar()
  return { ok: true }
}

export async function marcarHecho(id: string): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  if (typeof id !== 'string' || !id) return { ok: false, error: 'No existe ese vencimiento.' }
  const repo = await getRepo()
  if (!(await repo.vencimientos.get(id))) return { ok: false, error: 'No existe ese vencimiento.' }
  await repo.vencimientos.update(id, { hecho: true })
  refrescar()
  return { ok: true }
}
