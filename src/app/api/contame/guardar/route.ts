import { NextResponse, type NextRequest } from 'next/server'
import { guardarPropuesta } from '@/ai/contame'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { hoy } from '@/domain/fechas'

/** "Guardar todo" de Contame (ronda 6): guarda lo que Alfredo revisó en "Esto es lo que entendí". Sin IA. */
export async function POST(req: NextRequest) {
  try {
    await requerirRol('owner') // R20
  } catch (e) {
    if (e instanceof SinPermiso) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b || !Array.isArray(b.acciones)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  try {
    const r = await guardarPropuesta(getRepo(), b.acciones, hoy())
    if ('error' in r) return NextResponse.json(r, { status: 400 })
    return NextResponse.json(r)
  } catch (e) {
    console.error('[contame] guardar', e)
    return NextResponse.json({ error: 'No pude guardarlo, probá de nuevo.' }, { status: 500 })
  }
}
