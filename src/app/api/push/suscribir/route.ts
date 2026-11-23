import { NextResponse, type NextRequest } from 'next/server'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'

const texto = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max

export async function POST(req: NextRequest) {
  try {
    await requerirRol('owner') // R20
  } catch (e) {
    if (e instanceof SinPermiso) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  const keys = b?.keys
  if (!b || !texto(b.endpoint, 2048) || !b.endpoint.startsWith('https://') || b.endpoint.length < 12
    || !keys || !texto(keys.p256dh, 256) || !texto(keys.auth, 128)) {
    return NextResponse.json({ error: 'Suscripción inválida.' }, { status: 400 })
  }
  const repo = getRepo()
  const datos = { endpoint: b.endpoint, p256dh: keys.p256dh, auth: keys.auth }
  const [existente] = await repo.suscripciones.list({ endpoint: b.endpoint })
  if (existente) await repo.suscripciones.update(existente.id, datos)
  else await repo.suscripciones.create(datos)
  return NextResponse.json({ ok: true })
}
