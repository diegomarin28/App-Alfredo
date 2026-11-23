'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { hoy } from '@/domain/fechas'
import { validarFecha, type EntradaFecha } from '@/domain/validarFecha'

export async function agregarFecha(entrada: EntradaFecha): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requerirRol('owner', 'familia') // R20
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
  const r = validarFecha(entrada, Number(hoy().slice(0, 4)))
  if (!r.ok) return r
  await (await getRepo()).fechas.create(r.valor)
  revalidatePath('/calendario')
  revalidatePath('/')
  return { ok: true }
}
