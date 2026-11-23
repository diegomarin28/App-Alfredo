'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarCarpeta } from '@/domain/archivos'

type Res = { ok: true } | { ok: false; error: string }

export async function nuevaCarpeta(f: FormData): Promise<Res> {
  try {
    await requerirRol('owner') // R20: documentos es solo del owner
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
  const repo = getRepo()
  const r = validarCarpeta(f.get('nombre'), (await repo.carpetas.list()).map((c) => c.nombre))
  if (!r.ok) return r
  await repo.carpetas.create({ nombre: r.valor })
  revalidatePath('/documentos')
  return { ok: true }
}
