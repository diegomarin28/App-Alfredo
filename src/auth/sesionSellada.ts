/**
 * Sellado de la cookie de sesión con iron-session. Sin `server-only` ni `next/headers`:
 * lo comparten el middleware (Edge) y el servidor (session.ts).
 */
import { sealData, unsealData } from 'iron-session'
import { familiaVence, sesionVigente, type Rol, type Sesion } from './access'

export const COOKIE_SESION = 'alfredo_sesion'
export const COOKIE_DESAFIO = 'alfredo_desafio'

const DIA = 24 * 60 * 60
export const OWNER_SEGUNDOS = 180 * DIA
export const DESAFIO_SEGUNDOS = 5 * 60

export interface OpcionesCookie {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
}

export function opcionesCookie(maxAge: number): OpcionesCookie {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge }
}

/** SESSION_SECRET de al menos 32 caracteres; si no, error (nunca sesiones con un secreto débil). */
export function secretoSesion(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('SESSION_SECRET falta o tiene menos de 32 caracteres')
  return s
}

/** Datos + segundos de vida para una sesión nueva; null si la familia ya venció. */
export function nuevaSesion(rol: Rol, ahora: Date): { datos: Sesion; segundos: number } | null {
  if (rol === 'owner') return { datos: { rol: 'owner' }, segundos: OWNER_SEGUNDOS }
  const vence = familiaVence()
  const segundos = Math.floor((vence.getTime() - ahora.getTime()) / 1000)
  if (!(segundos > 0)) return null
  return { datos: { rol: 'familia', expira: vence.toISOString() }, segundos }
}

export async function sellar(datos: object, segundos: number): Promise<string> {
  return sealData(datos, { password: secretoSesion(), ttl: segundos })
}

/** Lee la cookie de sesión. Cualquier problema (sin secreto, sello inválido o vencido) → null. */
export async function leerSesion(valor: string | undefined, ahora: Date): Promise<Sesion | null> {
  if (!valor) return null
  try {
    return sesionVigente(await unsealData(valor, { password: secretoSesion() }), ahora)
  } catch {
    return null
  }
}

export interface Desafio {
  desafio: string
  tipo: 'registro' | 'entrada'
}

export async function leerDesafio(valor: string | undefined, tipo: Desafio['tipo']): Promise<string | null> {
  if (!valor) return null
  try {
    const d = (await unsealData(valor, { password: secretoSesion() })) as Partial<Desafio>
    return d.tipo === tipo && typeof d.desafio === 'string' && d.desafio ? d.desafio : null
  } catch {
    return null
  }
}
