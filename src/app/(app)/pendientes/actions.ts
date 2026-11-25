'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarId } from '@/domain/ids'
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

// ---------- editar (ronda 6: tocar la fila abre la hoja con el texto cargado) ----------

export async function editarPendiente(id: string, f: FormData): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const repo = getRepo()
  if (!validarId(id) || !(await repo.pendientes.get(id))) return { ok: false, error: 'No existe esa tarea.' }
  const v = validarPendiente(String(f.get('texto') ?? ''))
  if (!v.ok) return v
  await repo.pendientes.update(id, { texto: v.valor })
  refrescar()
  return { ok: true }
}

export async function editarNota(id: string, f: FormData): Promise<Res> {
  const p = await permitido()
  if (!p.ok) return p
  const repo = getRepo()
  if (!validarId(id) || !(await repo.notas.get(id))) return { ok: false, error: 'Esa nota ya no está.' }
  const v = validarNota(String(f.get('texto') ?? ''))
  if (!v.ok) return v
  await repo.notas.update(id, { texto: v.valor })
  refrescar()
  return { ok: true }
}
