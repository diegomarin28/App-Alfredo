import { NextResponse, type NextRequest } from 'next/server'
import { requerirRol, SinPermiso } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import { validarLectura } from '@/domain/archivos'

type MemoriaConArchivos = { leerArchivo(path: string): Promise<{ bytes: Uint8Array; tipo: string } | null> }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  let rol
  try {
    rol = (await requerirRol('owner', 'familia')).rol // R20
  } catch (e) {
    if (e instanceof SinPermiso) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
  const v = validarLectura(rol, (await params).path)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status })
  const repo = getRepo()
  // Memoria: la API sirve los bytes. Supabase: URL firmada (no usamos instanceof: Next puede duplicar módulos).
  if (!('leerArchivo' in repo)) {
    return NextResponse.redirect(await repo.urlArchivo(v.path), { headers: { 'Cache-Control': 'private, no-store' } })
  }
  const a = await (repo as unknown as MemoriaConArchivos).leerArchivo(v.path)
  if (!a) return NextResponse.json({ error: 'No existe.' }, { status: 404 })
  return new NextResponse(Buffer.from(a.bytes), {
    headers: { 'Content-Type': a.tipo, 'Cache-Control': 'private, max-age=3600' },
  })
}
