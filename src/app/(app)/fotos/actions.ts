'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarId } from '@/domain/ids'

type Res = { ok: true } | { ok: false; error: string }

async function permitido(): Promise<Res> {
  try {
    await requerirRol('owner', 'familia') // R20: fotos es del área de la familia
    return { ok: true }
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
}

const NO_ESTA: Res = { ok: false, error: 'Esa foto ya no está.' }

/** Borra la foto y su archivo. */
export async function borrarFoto(id: string): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  if (!validarId(id)) return NO_ESTA
  const repo = getRepo()
  const foto = await repo.fotos.get(id)
  if (!foto) return NO_ESTA
  await repo.fotos.remove(id)
  try {
    await repo.removeArchivo(foto.path)
  } catch (e) {
    // La foto ya no se muestra; un archivo huérfano no molesta a nadie.
    console.error('fotos: no se pudo borrar el archivo', foto.path, e)
  }
  revalidatePath('/fotos')
  revalidatePath('/')
  return { ok: true }
}
