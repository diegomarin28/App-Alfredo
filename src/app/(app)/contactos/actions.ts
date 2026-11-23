'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarContacto, type EntradaContacto } from '@/domain/contactos'

type Res = { ok: true } | { ok: false; error: string }

export async function agregarContacto(entrada: EntradaContacto): Promise<Res> {
  try {
    await requerirRol('owner') // R20
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
  const r = validarContacto(entrada)
  if (!r.ok) return r
  await (await getRepo()).contactos.create(r.valor)
  revalidatePath('/contactos')
  return { ok: true }
}
