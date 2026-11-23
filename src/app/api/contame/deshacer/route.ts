import { NextResponse, type NextRequest } from 'next/server'
import { deshacerLote } from '@/ai/contame'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    await requerirRol('owner') // R20
  } catch (e) {
    if (e instanceof SinPermiso) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b || typeof b.loteId !== 'string' || !UUID.test(b.loteId)) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
  try {
    return NextResponse.json({ borrados: await deshacerLote(getRepo(), b.loteId) })
  } catch (e) {
    console.error('[contame] deshacer', e)
    return NextResponse.json({ error: 'No pude deshacerlo, probá de nuevo.' }, { status: 500 })
  }
}
