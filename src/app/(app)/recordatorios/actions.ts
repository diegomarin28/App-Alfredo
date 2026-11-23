'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarRecordatorio, type EntradaRecordatorio } from '@/domain/recordatorios'

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

export async function guardarRecordatorio(id: string | null, entrada: EntradaRecordatorio): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const r = validarRecordatorio(entrada)
  if (!r.ok) return r
  const repo = await getRepo()
  if (id === null) {
    await repo.recordatorios.create(r.valor)
  } else {
    if (!(await repo.recordatorios.get(id))) return { ok: false, error: 'No existe ese recordatorio.' }
    await repo.recordatorios.update(id, r.valor)
  }
  revalidatePath('/recordatorios')
  revalidatePath('/')
  return { ok: true }
}
