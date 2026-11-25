'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarId } from '@/domain/ids'
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

async function cambiarHecho(id: string, hecho: boolean): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const repo = getRepo()
  if (!validarId(id) || !(await repo.vencimientos.get(id))) return { ok: false, error: 'No existe ese vencimiento.' }
  await repo.vencimientos.update(id, { hecho })
  refrescar()
  return { ok: true }
}

export async function marcarHecho(id: string): Promise<Res> {
  return cambiarHecho(id, true)
}

/** "Deshacer" del aviso que aparece después de tocar Hecho. */
export async function deshacerHecho(id: string): Promise<Res> {
  return cambiarHecho(id, false)
}

/** Ronda 6: editar un vencimiento (tocando la fila). */
export async function editarVencimiento(id: string, entrada: EntradaVencimiento): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const repo = getRepo()
  const actual = validarId(id) ? await repo.vencimientos.get(id) : null
  if (!actual) return { ok: false, error: 'No existe ese vencimiento.' }
  const r = validarVencimiento(entrada)
  if (!r.ok) return r
  const { titulo, ambito, fecha, avisarDiasAntes } = r.valor
  await repo.vencimientos.update(id, { titulo, ambito, fecha, avisarDiasAntes })
  refrescar()
  return { ok: true }
}
