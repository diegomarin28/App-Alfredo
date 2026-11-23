// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'

let sesion: { rol: 'owner' | 'familia' } | null = null
let repo = new MemoryRepo()
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('@/data/getRepo', () => ({ getRepo: () => repo }))
vi.mock('@/auth/session', async (orig) => {
  const real = await orig<typeof import('@/auth/session')>()
  return {
    ...real,
    requerirRol: async (...roles: ('owner' | 'familia')[]) => {
      if (!sesion) throw new real.SinPermiso(401)
      if (!roles.includes(sesion.rol)) throw new real.SinPermiso(403)
      return sesion
    },
  }
})

const { borrarFoto } = await import('@/app/(app)/fotos/actions')
const { borrarFecha } = await import('@/app/(app)/calendario/actions')
const { borrarPersona, borrarEvento, borrarServicio } = await import('@/app/(app)/casas/actions')
const { marcarHecho, deshacerHecho } = await import('@/app/(app)/vencimientos/actions')

const NO_EXISTE = 'c0ffee00-0000-4000-8000-000000000000'

beforeEach(() => {
  repo = new MemoryRepo()
  sesion = { rol: 'familia' }
})

describe('borrar (fotos, fechas, casas): owner y familia', () => {
  it('foto: borra la fila y el archivo', async () => {
    await repo.uploadArchivo('fotos/a.jpg', new Blob(['x'], { type: 'image/jpeg' }))
    const f = await repo.fotos.create({ path: 'fotos/a.jpg' })
    expect(await borrarFoto(f.id)).toEqual({ ok: true })
    expect(await repo.fotos.get(f.id)).toBeNull()
    expect(await repo.leerArchivo('fotos/a.jpg')).toBeNull()
  })

  it('fecha, persona, historial y servicio se borran', async () => {
    sesion = { rol: 'owner' }
    const fe = await repo.fechas.create({ nombre: 'Ana', tipo: 'cumple', dia: '11-25' })
    const p = await repo.personasCasa.create({ casa: 'malibu', nombre: 'Juan', rol: 'Jardín' })
    const e = await repo.eventosCasa.create({ casa: 'malibu', que: 'Bomba', cuando: '2026-10-01' })
    const s = await repo.serviciosCasa.create({ casa: 'malibu', clave: 'Wifi', valor: 'abc' })
    expect(await borrarFecha(fe.id)).toEqual({ ok: true })
    sesion = { rol: 'familia' }
    expect(await borrarPersona(p.id)).toEqual({ ok: true })
    expect(await borrarEvento(e.id)).toEqual({ ok: true })
    expect(await borrarServicio(s.id)).toEqual({ ok: true })
    expect(await repo.fechas.list()).toEqual([])
    expect(await repo.personasCasa.list()).toEqual([])
    expect(await repo.eventosCasa.list()).toEqual([])
    expect(await repo.serviciosCasa.list()).toEqual([])
  })

  it.each([
    ['foto', () => borrarFoto], ['fecha', () => borrarFecha], ['persona', () => borrarPersona],
    ['historial', () => borrarEvento], ['servicio', () => borrarServicio],
  ] as const)('%s: sin sesión no hace nada; id inválido o que no existe da un error amable', async (_n, accion) => {
    const borrar = accion() as (id: unknown) => Promise<{ ok: boolean; error?: string }>
    sesion = null
    expect(await borrar(NO_EXISTE)).toEqual({ ok: false, error: expect.any(String) })
    sesion = { rol: 'familia' }
    for (const id of [NO_EXISTE, '', 'x'.repeat(101), 3, null]) {
      const r = await borrar(id)
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/ya no está\.$/)
    }
  })
})

describe('vencimientos: deshacer Hecho (solo owner)', () => {
  it('deshacer vuelve hecho a false', async () => {
    sesion = { rol: 'owner' }
    const v = await repo.vencimientos.create({ titulo: 'Patente', ambito: 'personal', fecha: '2026-12-01', avisarDiasAntes: 7, hecho: false })
    expect(await marcarHecho(v.id)).toEqual({ ok: true })
    expect((await repo.vencimientos.get(v.id))!.hecho).toBe(true)
    expect(await deshacerHecho(v.id)).toEqual({ ok: true })
    expect((await repo.vencimientos.get(v.id))!.hecho).toBe(false)
  })

  it('familia no puede; id que no existe da error amable', async () => {
    const v = await repo.vencimientos.create({ titulo: 'Patente', ambito: 'personal', fecha: '2026-12-01', avisarDiasAntes: 7, hecho: true })
    expect((await deshacerHecho(v.id)).ok).toBe(false)
    expect((await repo.vencimientos.get(v.id))!.hecho).toBe(true)
    sesion = { rol: 'owner' }
    expect(await deshacerHecho(NO_EXISTE)).toEqual({ ok: false, error: 'No existe ese vencimiento.' })
    expect(await deshacerHecho('' as string)).toEqual({ ok: false, error: 'No existe ese vencimiento.' })
  })
})
