import { describe, expect, it } from 'vitest'
import { saludos, TONOS } from '@/domain/saludos'

describe('saludos (mockup v2)', () => {
  it('tres tonos, Formal primero (por defecto), firmados por quien manda', () => {
    expect(TONOS.map(([t, e]) => `${t}:${e}`)).toEqual(['formal:Formal', 'cercano:Cercano', 'breve:Breve'])
    const s = saludos('Martín', 'Alfredo')
    expect(s.formal).toBe('Martín, te deseo un muy feliz cumpleaños. Que tengas un lindo día junto a los tuyos. Un fuerte abrazo, Alfredo.')
    expect(s.cercano).toBe('¡Feliz cumpleaños, Martín! Que pases un lindo día con los tuyos. Un abrazo grande, Alfredo.')
    expect(s.breve).toBe('¡Feliz cumpleaños, Martín! Un abrazo, Alfredo.')
  })

  it('nunca juvenil: sin emojis ni jerga', () => {
    for (const t of Object.values(saludos('Ana', 'Alfredo'))) {
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(t).not.toMatch(/bárbaro|genial|crack|cumple\b/i)
    }
  })
})
