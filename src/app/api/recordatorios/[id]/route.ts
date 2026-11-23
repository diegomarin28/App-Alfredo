import { NextResponse, type NextRequest } from 'next/server'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { hoy, posponer, resolver } from '@/domain/fechas'
import { cambioResolver, validarAccion } from '@/domain/recordatorios'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    await requerirRol('owner', 'familia') // R20
  } catch (e) {
    if (e instanceof SinPermiso) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const { id } = await params
  const body = (await req.json().catch(() => null)) as { accion?: unknown } | null
  const accion = validarAccion(body?.accion)
  if (!accion) return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 })
  const repo = await getRepo()
  const actual = await repo.recordatorios.get(id)
  if (!actual) return NextResponse.json({ error: 'No existe ese recordatorio.' }, { status: 404 })
  const patch = accion === 'posponer'
    ? { pospuestoHasta: posponer(actual, hoy()).pospuestoHasta }
    : cambioResolver(resolver(actual, hoy()))
  const guardado = await repo.recordatorios.update(id, patch)
  return NextResponse.json(guardado)
}
