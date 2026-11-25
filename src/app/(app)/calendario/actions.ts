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
  const hoyStr = hoy()
  const r = validarFecha(entrada, Number(hoyStr.slice(0, 4)), hoyStr)
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

/** Ronda 6: editar una fecha (tocando la fila del Calendario). */
export async function editarFecha(id: string, entrada: EntradaFecha): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const repo = getRepo()
  const actual = validarId(id) ? await repo.fechas.get(id) : null
  if (!actual) return { ok: false, error: 'Esa fecha ya no está.' }
  const hoyStr = hoy()
  const r = validarFecha(entrada, Number(hoyStr.slice(0, 4)), hoyStr)
  if (!r.ok) return r
  const v = r.valor
  // semanal con días que ya lo era: conserva desde cuándo
  const inicio = v.diasSemana && actual.diasSemana?.length && actual.dia ? { dia: actual.dia, anioEvento: actual.anioEvento ?? null } : null
  await repo.fechas.update(id, {
    nombre: v.nombre,
    tipo: v.tipo,
    dia: inicio?.dia ?? v.dia,
    anioNacimiento: v.anioNacimiento ?? null,
    // la columna no acepta null: el cumpleaños es siempre todos los años
    repeticion: v.repeticion ?? 'anual',
    anioEvento: inicio ? inicio.anioEvento : v.anioEvento ?? null,
    hora: v.hora ?? null,
    diasSemana: v.diasSemana ?? null,
  })
  revalidatePath('/calendario')
  revalidatePath('/')
  return { ok: true }
}
