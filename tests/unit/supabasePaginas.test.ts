// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { esIdInvalido, leerTodo, PAGINA } from '@/data/supabaseUtil'
import { TablaSupabase } from '@/data/supabaseRepo'

const filas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${String(i).padStart(5, '0')}`, n: i }))

describe('leerTodo (paginado de PostgREST)', () => {
  it('pide páginas de 1000 hasta que una viene incompleta', async () => {
    const todas = filas(2345)
    const pedidos: [number, number][] = []
    const r = await leerTodo(async (desde, hasta) => {
      pedidos.push([desde, hasta])
      return { data: todas.slice(desde, hasta + 1), error: null }
    }, 'x.list')
    expect(PAGINA).toBe(1000)
    expect(pedidos).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
    expect(r).toHaveLength(2345)
    expect(r.at(-1)).toEqual(todas.at(-1))
  })

  it('exactamente 1000 filas: pide una página más (vacía) y termina', async () => {
    const todas = filas(1000)
    let pedidos = 0
    const r = await leerTodo(async (d, h) => { pedidos++; return { data: todas.slice(d, h + 1), error: null } }, 'x.list')
    expect(r).toHaveLength(1000)
    expect(pedidos).toBe(2)
  })

  it('un error en cualquier página falla con el lugar', async () => {
    await expect(leerTodo(async (d) => d === 0
      ? { data: filas(1000), error: null }
      : { data: null, error: { message: 'boom' } }, 'uso_ia.list')).rejects.toThrow(/uso_ia\.list.*boom/)
  })
})

describe('esIdInvalido', () => {
  it('solo el código 22P02 de Postgres (texto que no es uuid)', () => {
    expect(esIdInvalido({ code: '22P02', message: 'invalid input syntax for type uuid: "x"' })).toBe(true)
    expect(esIdInvalido({ code: '23505', message: 'duplicate key' })).toBe(false)
    expect(esIdInvalido({ message: 'otra cosa' })).toBe(false)
    expect(esIdInvalido(null)).toBe(false)
  })
})

/** Constructor de consultas falso: registra las llamadas y responde según range(). */
function dbFalsa(total: number, opts: { errorCode?: string } = {}) {
  const todas = filas(total)
  const llamadas: string[] = []
  const error = opts.errorCode ? { code: opts.errorCode, message: 'invalid input syntax for type uuid' } : null
  function builder() {
    let desde = 0
    let hasta = Infinity
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'match', 'eq', 'update', 'delete', 'insert']) {
      b[m] = (...a: unknown[]) => { llamadas.push(`${m}(${a.map((x) => JSON.stringify(x)).join(',')})`); return b }
    }
    b.order = (col: string, o?: { ascending?: boolean }) => { llamadas.push(`order(${col},${o?.ascending === false ? 'desc' : 'asc'})`); return b }
    b.range = (d: number, h: number) => { llamadas.push(`range(${d},${h})`); desde = d; hasta = h; return b }
    const resultado = () => (error ? { data: null, error } : { data: todas.slice(desde, hasta + 1), error: null })
    b.maybeSingle = async () => (error ? { data: null, error } : { data: null, error: null })
    b.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(resultado()).then(ok, ko)
    return b
  }
  const db = { from: (t: string) => { llamadas.push(`from(${t})`); return builder() } } as unknown as SupabaseClient
  return { db, llamadas }
}

describe('TablaSupabase', () => {
  it('list trae más de 1000 filas paginando, con id como desempate', async () => {
    const { db, llamadas } = dbFalsa(2500)
    const t = new TablaSupabase<{ id: string }>(db, 'uso_ia')
    expect(await t.list()).toHaveLength(2500)
    expect(llamadas.filter((l) => l.startsWith('range'))).toEqual(['range(0,999)', 'range(1000,1999)', 'range(2000,2999)'])
    expect(llamadas.slice(0, 5)).toEqual(['from(uso_ia)', 'select("*")', 'match({})', 'order(creado_en,asc)', 'order(id,asc)'])
  })

  it('eventos: más nuevo primero y después id', async () => {
    const { db, llamadas } = dbFalsa(3)
    await new TablaSupabase<{ id: string }>(db, 'eventos_casa', { nuevoPrimero: true }).list()
    expect(llamadas.filter((l) => l.startsWith('order'))).toEqual(['order(cuando,desc)', 'order(creado_en,desc)', 'order(id,asc)'])
  })

  it('id que no es uuid (22P02): get da null, update "No existe", remove no falla', async () => {
    const { db } = dbFalsa(0, { errorCode: '22P02' })
    const t = new TablaSupabase<{ id: string; x?: number }>(db, 'fotos')
    expect(await t.get('basura')).toBeNull()
    await expect(t.update('basura', { x: 1 })).rejects.toThrow('No existe basura')
    await expect(t.remove('basura')).resolves.toBeUndefined()
  })

  it('otros errores siguen fallando', async () => {
    const { db } = dbFalsa(0, { errorCode: '42P01' })
    const t = new TablaSupabase<{ id: string }>(db, 'fotos')
    await expect(t.get('x')).rejects.toThrow(/Supabase \(fotos\.get\)/)
    await expect(t.remove('x')).rejects.toThrow(/fotos\.remove/)
  })
})
