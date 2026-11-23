import 'server-only'
import { NextResponse } from 'next/server'
import { requerirRol, SinPermiso } from '@/auth/session'

export const json = (datos: unknown, status = 200) =>
  NextResponse.json(datos, { status, headers: { 'Cache-Control': 'no-store' } })

/** R20: null si es el owner; si no, la respuesta 401/403 para devolver. */
export async function soloOwner(): Promise<NextResponse | null> {
  try {
    await requerirRol('owner')
    return null
  } catch (e) {
    if (e instanceof SinPermiso) return json({ error: e.message }, e.status)
    throw e
  }
}
