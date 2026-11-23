import 'server-only'
import { cookies } from 'next/headers'
import type { Rol, Sesion } from './access'
import {
  COOKIE_DESAFIO, COOKIE_SESION, DESAFIO_SEGUNDOS, leerDesafio, leerSesion, nuevaSesion,
  opcionesCookie, sellar, type Desafio,
} from './sesionSellada'

export type { Rol, Sesion } from './access'

/** Sesión vigente de quien pide (null si no hay, es inválida o la familia ya venció). */
export async function getSesion(): Promise<Sesion | null> {
  const jar = await cookies()
  return leerSesion(jar.get(COOKIE_SESION)?.value, new Date())
}

/**
 * Abre una sesión (solo en route handlers / server actions).
 * Owner: 180 días. Familia: hasta FAMILY_EXPIRES_AT; si ya venció no abre nada y devuelve false.
 */
export async function iniciarSesion(rol: Rol): Promise<boolean> {
  const nueva = nuevaSesion(rol, new Date())
  if (!nueva) return false
  const jar = await cookies()
  jar.set(COOKIE_SESION, await sellar(nueva.datos, nueva.segundos), opcionesCookie(nueva.segundos))
  return true
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_SESION, '', opcionesCookie(0))
  jar.set(COOKIE_DESAFIO, '', opcionesCookie(0))
}

/** Guarda el desafío WebAuthn (sellado, 5 minutos) entre "opciones" y "verificar". */
export async function guardarDesafio(desafio: string, tipo: Desafio['tipo']): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_DESAFIO, await sellar({ desafio, tipo }, DESAFIO_SEGUNDOS), opcionesCookie(DESAFIO_SEGUNDOS))
}

/** Lee y borra el desafío: sirve una sola vez. */
export async function tomarDesafio(tipo: Desafio['tipo']): Promise<string | null> {
  const jar = await cookies()
  const desafio = await leerDesafio(jar.get(COOKIE_DESAFIO)?.value, tipo)
  jar.set(COOKIE_DESAFIO, '', opcionesCookie(0))
  return desafio
}

/** Error de autorización para server actions y route handlers (R20). */
export class SinPermiso extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? 'Sin sesión.' : 'No tenés permiso para esto.')
  }
}

/**
 * Cada server action y route handler debe llamarla primero (R20): las actions se pueden invocar
 * desde cualquier página, así que el middleware no alcanza. Lanza SinPermiso (401 sin sesión, 403 rol no permitido).
 */
export async function requerirRol(...roles: Rol[]): Promise<Sesion> {
  const sesion = await getSesion()
  if (!sesion) throw new SinPermiso(401)
  if (!roles.includes(sesion.rol)) throw new SinPermiso(403)
  return sesion
}
