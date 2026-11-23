// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'
import { getRepo } from '@/data/getRepo'
import { repoContract } from './repo.contract'

repoContract('memoria', async () => new MemoryRepo().seed())

describe('MemoryRepo', () => {
  it('sin seed arranca vacío y con config por defecto', async () => {
    const repo = new MemoryRepo()
    expect(await repo.recordatorios.list()).toEqual([])
    expect(await repo.getConfig()).toEqual({ nombre: 'Alfredo', estiloEscritura: '', alertaIaEnviada: false })
  })

  it('seed carga exactamente 6 recordatorios y 4 carpetas', async () => {
    const repo = new MemoryRepo().seed()
    expect(await repo.recordatorios.list()).toHaveLength(6)
    expect((await repo.carpetas.list()).map((c) => c.nombre)).toEqual(['Seguros', 'Escrituras', 'Autos', 'Personales'])
  })

  it('vaciar borra todo y deja la config por defecto', async () => {
    const repo = new MemoryRepo().seed()
    await repo.setConfig({ nombre: 'Otro' })
    await repo.uploadArchivo('fotos/a.txt', new Blob(['a']))
    repo.vaciar()
    expect(await repo.recordatorios.list()).toEqual([])
    expect(await repo.carpetas.list()).toEqual([])
    expect((await repo.getConfig()).nombre).toBe('Alfredo')
    expect(await repo.leerArchivo('fotos/a.txt')).toBeNull()
  })

  it('leerArchivo devuelve bytes y tipo; urlArchivo apunta a /api/archivos', async () => {
    const repo = new MemoryRepo()
    await repo.uploadArchivo('documentos/a.txt', new Blob(['hola'], { type: 'text/plain' }))
    const a = await repo.leerArchivo('documentos/a.txt')
    expect(new TextDecoder().decode(a!.bytes)).toBe('hola')
    expect(a!.tipo).toBe('text/plain')
    expect(await repo.urlArchivo('documentos/a.txt')).toBe('/api/archivos/documentos/a.txt')
    expect(await repo.leerArchivo('fotos/nada.txt')).toBeNull()
  })

  it('devuelve copias: mutar un resultado no cambia lo guardado', async () => {
    const repo = new MemoryRepo()
    const p = await repo.pendientes.create({ texto: 'a', hecho: false })
    p.texto = 'mutado'
    expect((await repo.pendientes.get(p.id))!.texto).toBe('a')
  })
})

describe('getRepo', () => {
  const env = process.env.DATA_BACKEND
  afterEach(() => {
    delete globalThis.__alfredoRepo
    if (env === undefined) delete process.env.DATA_BACKEND
    else process.env.DATA_BACKEND = env
  })

  it('devuelve siempre la misma instancia de memoria, ya con seed', async () => {
    delete process.env.DATA_BACKEND
    const a = getRepo()
    expect(getRepo()).toBe(a)
    expect(await a.recordatorios.list()).toHaveLength(6)
  })

  it('usa Supabase cuando DATA_BACKEND=supabase (falla sin credenciales)', () => {
    process.env.DATA_BACKEND = 'supabase'
    delete globalThis.__alfredoRepo
    const antes = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SERVICE_ROLE_KEY }
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    try {
      expect(() => getRepo()).toThrow(/SUPABASE_URL/)
    } finally {
      if (antes.u) process.env.SUPABASE_URL = antes.u
      if (antes.k) process.env.SUPABASE_SERVICE_ROLE_KEY = antes.k
    }
  })
})
