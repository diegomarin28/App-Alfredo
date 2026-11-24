// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { avisosDelDia } from '@/avisos/calcular'
import { FakePushSender } from '@/avisos/push'
import { manejarCron } from '@/avisos/cron'
import { MemoryRepo } from '@/data/memoryRepo'
import type { Fecha, Recordatorio, Vencimiento } from '@/domain/tipos'

const cumple = (nombre: string, dia: string): Fecha => ({ id: nombre, nombre, tipo: 'cumple', dia })
const vacio = { fechas: [], recordatorios: [], vencimientos: [] }

describe('avisosDelDia', () => {
  it('cumple mañana', () => {
    const a = avisosDelDia({ ...vacio, fechas: [cumple('Ana', '11-25')] }, '2026-11-24')
    expect(a).toEqual([{ titulo: 'Mañana cumple Ana', cuerpo: '', url: '/calendario' }])
  })
  it('cumple hoy', () => {
    const a = avisosDelDia({ ...vacio, fechas: [cumple('Ana', '11-25')] }, '2026-11-25')
    expect(a.map((x) => x.titulo)).toEqual(['Hoy cumple Ana'])
  })
  it('cumple lejano no avisa', () => {
    expect(avisosDelDia({ ...vacio, fechas: [cumple('Ana', '12-25')] }, '2026-11-25')).toEqual([])
  })
  it('las fechas "Otra" que caen hoy avisan (con la hora, si tiene); las de otro día no', () => {
    const f: Fecha[] = [
      { id: 'b', nombre: 'Aniversario de bodas', tipo: 'otra', dia: '11-25' },
      { id: 'r', nombre: 'Reunión del club', tipo: 'otra', dia: '11-04', anioEvento: 2026, repeticion: 'semanal', hora: '18:30:00' },
      { id: 'x', nombre: 'Otra cosa', tipo: 'otra', dia: '11-26' },
    ]
    expect(avisosDelDia({ ...vacio, fechas: f }, '2026-11-25')).toEqual([
      { titulo: 'Hoy: Aniversario de bodas', cuerpo: '', url: '/calendario' },
      { titulo: 'Hoy: Reunión del club', cuerpo: 'A las 18:30', url: '/calendario' },
    ])
  })
  const nav: Recordatorio = { id: 'n', titulo: 'Gestionar Navidad', dia: '12-25', avisarDiasAntes: 60 }
  it('recordatorio en ventana', () => {
    const a = avisosDelDia({ ...vacio, recordatorios: [nav] }, '2026-10-26')
    expect(a).toEqual([{ titulo: 'Gestionar Navidad', cuerpo: 'Faltan 60 días', url: '/recordatorios' }])
  })
  it('cuerpo con 0 y 1 día', () => {
    expect(avisosDelDia({ ...vacio, recordatorios: [nav] }, '2026-12-25')[0].cuerpo).toBe('Es hoy')
    expect(avisosDelDia({ ...vacio, recordatorios: [nav] }, '2026-12-24')[0].cuerpo).toBe('Falta 1 día')
  })
  it('recordatorio resuelto o fuera de ventana se excluye', () => {
    expect(avisosDelDia({ ...vacio, recordatorios: [{ ...nav, resueltoAnio: 2026 }] }, '2026-10-26')).toEqual([])
    expect(avisosDelDia({ ...vacio, recordatorios: [nav] }, '2026-10-25')).toEqual([])
  })
  it('vencimientos: ventana, hecho y cuerpos', () => {
    const v = (fecha: string, extra: Partial<Vencimiento> = {}): Vencimiento =>
      ({ id: fecha, titulo: 'BPS', ambito: 'empresa', fecha, avisarDiasAntes: 7, hecho: false, ...extra })
    const cuerpos = (...vs: Vencimiento[]) => avisosDelDia({ ...vacio, vencimientos: vs }, '2026-11-24').map((x) => x.cuerpo)
    expect(cuerpos(v('2026-11-24'), v('2026-11-25'), v('2026-11-28'), v('2026-11-21'))).toEqual(['Venció hace 3 días', 'Hoy', 'Mañana', 'En 4 días'])
    expect(cuerpos(v('2026-12-01'))).toEqual(['En 7 días'])
    expect(cuerpos(v('2026-12-02'), v('2026-11-25', { hecho: true }))).toEqual([])
    const a = avisosDelDia({ ...vacio, vencimientos: [v('2026-11-24')] }, '2026-11-24')[0]
    expect(a).toMatchObject({ titulo: 'Vence BPS', url: '/vencimientos' })
  })
})

describe('GET /api/cron/avisos (manejarCron)', () => {
  let repo: MemoryRepo
  let push: FakePushSender
  const pedir = (auth?: string) => new Request('http://x/api/cron/avisos', { headers: auth ? { authorization: auth } : {} })
  const deps = () => ({ repo, push, hoy: '2026-11-24' })

  beforeEach(async () => {
    process.env.CRON_SECRET = 's3cret'
    repo = new MemoryRepo()
    push = new FakePushSender()
    await repo.fechas.create({ nombre: 'Ana', tipo: 'cumple', dia: '11-25' })
    await repo.vencimientos.create({ titulo: 'BPS', ambito: 'empresa', fecha: '2026-11-24', avisarDiasAntes: 7, hecho: false })
    await repo.suscripciones.create({ endpoint: 'https://push.example/a', p256dh: 'k', auth: 'a' })
    await repo.suscripciones.create({ endpoint: 'https://push.example/b', p256dh: 'k', auth: 'a' })
  })
  afterEach(() => { delete process.env.CRON_SECRET })

  it('sin header, con secreto equivocado o sin CRON_SECRET → 401 y no envía', async () => {
    expect((await manejarCron(pedir(), deps())).status).toBe(401)
    expect((await manejarCron(pedir('Bearer otro'), deps())).status).toBe(401)
    expect((await manejarCron(pedir('s3cret'), deps())).status).toBe(401)
    delete process.env.CRON_SECRET
    expect((await manejarCron(pedir('Bearer '), deps())).status).toBe(401)
    expect((await manejarCron(pedir('Bearer undefined'), deps())).status).toBe(401)
    expect(push.enviados).toHaveLength(0)
  })

  it('con secreto: una entrega por aviso por suscripción', async () => {
    const res = await manejarCron(pedir('Bearer s3cret'), deps())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ avisos: 2, enviados: 4, borradas: 0 })
    expect(push.enviados).toHaveLength(4)
    expect(push.enviados[0].payload).toEqual({ titulo: 'Mañana cumple Ana', cuerpo: '', url: '/calendario' })
  })

  it('410 y 404 borran la suscripción; otro error se saltea sin cortar', async () => {
    push.fallar('https://push.example/a', 410)
    const res = await manejarCron(pedir('Bearer s3cret'), deps())
    expect(await res.json()).toEqual({ avisos: 2, enviados: 2, borradas: 1 })
    expect((await repo.suscripciones.list()).map((s) => s.endpoint)).toEqual(['https://push.example/b'])

    push.fallar('https://push.example/b', 500)
    const r2 = await manejarCron(pedir('Bearer s3cret'), deps())
    expect(await r2.json()).toEqual({ avisos: 2, enviados: 0, borradas: 0 })
    expect(await repo.suscripciones.list()).toHaveLength(1)
  })
})
