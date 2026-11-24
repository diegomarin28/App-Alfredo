import { describe, expect, it } from 'vitest'
import { cajaCabeza, ESCENAS, ORIGEN_MENTON } from '@/marca/intro'

describe('intro: la cabeza sobre cada cuerpo (posiciones_cabeza.json, como en los mockups)', () => {
  it('golf1 y padel1 dan las mismas cajas que CargaGolf / CargaPadel', () => {
    const g = cajaCabeza('golf1')
    expect(g.left).toBeCloseTo(151.6, 0); expect(g.top).toBeCloseTo(-5.2, 0); expect(g.width).toBeCloseTo(70.3, 1); expect(g.height).toBeCloseTo(109.4, 1)
    const p = cajaCabeza('padel1')
    expect(p.left).toBeCloseTo(176.6, 0); expect(p.top).toBeCloseTo(9.9, 0); expect(p.width).toBeCloseTo(75.7, 1); expect(p.rot).toBe(-4)
    expect(cajaCabeza('golf3')).toMatchObject({ rot: 14 })
  })
  it('origen en el mentón y tiempos de los cuadros', () => {
    expect(ORIGEN_MENTON).toBe('50% 82.7%')
    expect(ESCENAS.golf.cuadros.map(([, d]) => d)).toEqual([0, 0.32, 0.5, 0.56])
    expect(ESCENAS.padel.duracionMs).toBe(2400)
  })
})
