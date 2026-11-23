/**
 * SOLO PARA PRUEBAS. 404 salvo ENABLE_TEST_ROUTES=1 + NODE_ENV≠production + datos en memoria.
 *   POST /api/test/login  { rol: 'owner' | 'familia' }
 *   POST /api/test/reset  { datos?, config?, sinSeed?, hoy? }
 */
import { NextResponse, type NextRequest } from 'next/server'
import { rutasDePruebaHabilitadas } from '@/auth/pruebas'
import { iniciarSesion } from '@/auth/session'
import { getRepo } from '@/data/getRepo'
import type { MemoryRepo } from '@/data/memoryRepo'
import { ENTIDADES, type Entidad } from '@/data/repo'
import { setHoyDePrueba } from '@/domain/fechas'
import type { Config } from '@/domain/tipos'

type Ctx = { params: Promise<{ accion: string }> }

const noExiste = () => NextResponse.json({ error: 'No existe.' }, { status: 404 })
const mal = (error: string) => NextResponse.json({ error }, { status: 400 })

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!rutasDePruebaHabilitadas()) return noExiste()
  const { accion } = await params
  const b = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

  if (accion === 'login') {
    if (b.rol !== 'owner' && b.rol !== 'familia') return mal('rol inválido')
    if (!(await iniciarSesion(b.rol))) return mal('el modo familia ya venció')
    return NextResponse.json({ ok: true })
  }

  if (accion === 'reset') {
    // Sin instanceof: en dev cada ruta puede tener su propia copia de la clase; el repo vive en globalThis.
    const repo = getRepo() as MemoryRepo
    if (typeof repo.vaciar !== 'function' || typeof repo.seed !== 'function') return noExiste()
    const datos = (b.datos ?? {}) as Record<string, unknown>
    const desconocida = Object.keys(datos).find((k) => !ENTIDADES.includes(k as Entidad))
    if (desconocida) return mal(`entidad desconocida: ${desconocida}`)
    if (b.hoy !== undefined && !(typeof b.hoy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.hoy))) return mal('hoy inválido')
    repo.vaciar()
    if (!b.sinSeed) repo.seed()
    for (const [entidad, filas] of Object.entries(datos)) {
      if (!Array.isArray(filas)) return mal(`${entidad} debe ser una lista`)
      const tabla = repo[entidad as Entidad] as unknown as { create(d: object): Promise<unknown> }
      for (const fila of filas) await tabla.create(fila as object)
    }
    if (b.config) await repo.setConfig(b.config as Partial<Config>)
    setHoyDePrueba((b.hoy as string | undefined) ?? null)
    return NextResponse.json({ ok: true })
  }

  return noExiste()
}
