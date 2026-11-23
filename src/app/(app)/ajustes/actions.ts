'use server'
import { revalidatePath } from 'next/cache'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarEstilo, validarNombre, type ResultadoTexto } from '@/domain/validarAjustes'

type Respuesta = { ok: true } | { ok: false; error: string }

async function guardar(campo: 'nombre' | 'estiloEscritura', validar: (x: unknown) => ResultadoTexto, entrada: unknown): Promise<Respuesta> {
  try {
    await requerirRol('owner')
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message }
    throw e
  }
  const r = validar(entrada)
  if (!r.ok) return r
  await (await getRepo()).setConfig({ [campo]: r.valor })
  revalidatePath('/ajustes')
  revalidatePath('/')
  return { ok: true }
}

export async function guardarNombre(nombre: string): Promise<Respuesta> {
  return guardar('nombre', validarNombre, nombre)
}

export async function guardarEstilo(estilo: string): Promise<Respuesta> {
  return guardar('estiloEscritura', validarEstilo, estilo)
}
