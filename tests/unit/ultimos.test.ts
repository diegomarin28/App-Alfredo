// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MemoryRepo } from '@/data/memoryRepo'
import { ultimosGuardados } from '@/domain/ultimos'

describe('ultimosGuardados (Contame: "Lo último que guardé")', () => {
  it('solo lo que guardó Contame, lo más nuevo primero, con dónde quedó', async () => {
    const repo = new MemoryRepo()
    await repo.pendientes.create({ texto: 'A mano', hecho: false, creadoEn: '2026-11-22T10:00:00Z' })
    await repo.eventosCasa.create({ casa: 'portofino', que: 'Simón vino a cortar el pasto', cuando: '2026-11-22', loteId: 'l1', creadoEn: '2026-11-22T11:00:00Z' })
    await repo.vencimientos.create({ titulo: 'Vence el seguro del auto', ambito: 'personal', fecha: '2026-11-29', avisarDiasAntes: 7, hecho: false, loteId: 'l1', creadoEn: '2026-11-22T11:00:01Z' })
    await repo.pendientes.create({ texto: 'Llamar a DirecTV', hecho: false, loteId: 'l1', creadoEn: '2026-11-22T11:00:02Z' })
    await repo.notas.create({ texto: 'Vieja', origen: 'voz', loteId: 'l0', creadoEn: '2026-11-01T11:00:00Z' })
    const u = await ultimosGuardados(repo)
    expect(u.map(({ titulo, detalle, clase }) => [titulo, detalle, clase])).toEqual([
      ['Llamar a DirecTV', 'Tareas pendientes', 'pendiente'],
      ['Vence el seguro del auto', 'Vencimientos · 29 nov', 'vencimiento'],
      ['Simón vino a cortar el pasto', 'Portofino · historial', 'casa'],
    ])
  })
})
