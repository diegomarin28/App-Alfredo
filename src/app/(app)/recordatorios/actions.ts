'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { hoy } from '@/domain/fechas'
import { cambioEdicion, validarRecordatorio, type EntradaRecordatorio } from '@/domain/recordatorios'

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
  const repo = await getRepo()
  const actual = id === null ? null : await repo.recordatorios.get(id)
  if (id !== null && !actual) return { ok: false, error: 'No existe ese recordatorio.' }
  // Semanal con días: guarda como inicio hoy, o el que ya tenía si ya era semanal con días.
  const desde = actual?.diasSemana?.length && actual.dia ? `${actual.anio ?? hoy().slice(0, 4)}-${actual.dia}` : hoy()
  const r = validarRecordatorio(entrada, actual !== null && actual.dia === null, desde)
  if (!r.ok) return r
  if (actual) await repo.recordatorios.update(actual.id, cambioEdicion(actual, r.valor))
  else await repo.recordatorios.create(r.valor)
  revalidatePath('/recordatorios')
  revalidatePath('/')
  return { ok: true }
}
