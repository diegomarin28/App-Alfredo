import { describe, expect, it } from 'vitest'
import { saludos } from '@/domain/saludos'

describe('saludos', () => {
  it('textos exactos con el nombre puesto', () => {
    const s = saludos('Martín')
    expect(s.calido).toBe('¡Feliz cumple, Martín! Que lo pases bárbaro. Un abrazo grande.')
    expect(s.formal).toBe('Muy feliz cumpleaños, Martín. Te deseo un gran año, con salud y alegría.')
    expect(s.corto).toBe('¡Feliz cumple, Martín! Que se cumplan todos tus deseos.')
  })
})
